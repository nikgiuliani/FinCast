import { NextResponse } from 'next/server';
export async function GET(req) {
  const address = new URL(req.url).searchParams.get('address')?.trim();
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
  const u = new URL('https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress');
  u.searchParams.set('address', address);
  u.searchParams.set('benchmark', 'Public_AR_Current');
  u.searchParams.set('vintage', 'Current_Current');
  u.searchParams.set('format', 'json');
  try {
    const r = await fetch(u, { next: { revalidate: 86400 } });
    const j = await r.json();
    const m = j?.result?.addressMatches?.[0];
    if (!m) return NextResponse.json({ matched: false, source: 'US Census Geocoder' });
    const g = m.geographies || {};
    const county = (g.Counties || [])[0];
    return NextResponse.json({
      matched: true,
      matchedAddress: m.matchedAddress,
      coordinates: m.coordinates,
      state: m.addressComponents?.state,
      zip: m.addressComponents?.zip,
      city: m.addressComponents?.city,
      county: county?.NAME,
      countyFips: county?.GEOID,
      source: 'US Census Geocoder',
      live: true,
    });
  } catch (e) {
    return NextResponse.json(
      { matched: false, error: 'Census geocoder unavailable', source: 'fallback' },
      { status: 502 },
    );
  }
}
