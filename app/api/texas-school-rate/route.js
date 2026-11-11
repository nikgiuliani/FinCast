import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const schoolDistrictLayer =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/14/query';
const comptrollerRatesPage = 'https://comptroller.texas.gov/taxes/property-tax/rates/index.php';

function normalizeDistrictName(name) {
  return String(name)
    .replace(/\bindependent school district\b/gi, 'ISD')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export async function GET(request) {
  const search = new URL(request.url).searchParams;
  const latitude = Number(search.get('lat'));
  const longitude = Number(search.get('lon'));

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < 24 ||
    latitude > 37 ||
    longitude < -107 ||
    longitude > -93
  ) {
    return NextResponse.json({ error: 'Valid Texas coordinates are required.' }, { status: 400 });
  }

  try {
    const districtUrl = new URL(schoolDistrictLayer);
    districtUrl.searchParams.set('geometry', `${longitude},${latitude}`);
    districtUrl.searchParams.set('geometryType', 'esriGeometryPoint');
    districtUrl.searchParams.set('inSR', '4326');
    districtUrl.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    districtUrl.searchParams.set('outFields', 'BASENAME');
    districtUrl.searchParams.set('returnGeometry', 'false');
    districtUrl.searchParams.set('f', 'json');

    const districtResponse = await fetch(districtUrl, { next: { revalidate: 86400 } });
    if (!districtResponse.ok) throw new Error('Census school district lookup failed.');
    const districtData = await districtResponse.json();
    const districtName = districtData?.features?.[0]?.attributes?.BASENAME;
    if (!districtName) {
      return NextResponse.json(
        { error: 'No school district matched these coordinates.' },
        { status: 404 },
      );
    }

    const taxYear = new Date().getFullYear() - 1;
    const ratesUrl = `https://comptroller.texas.gov/taxes/property-tax/docs/${taxYear}-school-district-rates-levies.xlsx`;
    const ratesResponse = await fetch(ratesUrl, { next: { revalidate: 86400 } });
    if (!ratesResponse.ok) throw new Error(`Texas ${taxYear} school rate data is unavailable.`);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await ratesResponse.arrayBuffer());
    const ratesSheet = workbook.getWorksheet('Summary');
    if (
      ratesSheet?.getCell(3, 2).value !== 'TAXING UNIT NAME' ||
      ratesSheet?.getCell(3, 11).value !== 'TOTAL TAX RATE'
    ) {
      throw new Error('Texas Comptroller school rate data has an unexpected format.');
    }

    const targetName = normalizeDistrictName(districtName);
    const matchedRates = new Set();
    for (let rowNumber = 4; rowNumber <= ratesSheet.rowCount; rowNumber += 1) {
      const row = ratesSheet.getRow(rowNumber);
      if (normalizeDistrictName(row.getCell(2).text) !== targetName) continue;
      const rate = Number(row.getCell(11).value);
      if (Number.isFinite(rate) && rate >= 0 && rate <= 5) matchedRates.add(rate);
    }

    if (matchedRates.size === 0) {
      return NextResponse.json(
        {
          error: `No ${taxYear} Comptroller rate was found for ${districtName}.`,
          schoolDistrict: districtName,
          taxYear,
        },
        { status: 404 },
      );
    }
    if (matchedRates.size > 1) {
      return NextResponse.json(
        {
          error: `The Comptroller reports multiple rates for ${districtName}; verify the rate with the local appraisal district.`,
          schoolDistrict: districtName,
          taxYear,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      schoolDistrict: districtName,
      schoolTaxRate: [...matchedRates][0],
      taxYear,
      source: `Texas Comptroller ${taxYear} school district rates`,
      sourceUrl: comptrollerRatesPage,
    });
  } catch (error) {
    console.error('Texas school tax rate lookup failed:', error);
    return NextResponse.json(
      { error: 'Unable to retrieve an official school district tax rate right now.' },
      { status: 502 },
    );
  }
}
