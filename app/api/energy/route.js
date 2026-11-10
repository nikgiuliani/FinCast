import { NextResponse } from 'next/server';
const fallback = { UT: 11.8, TX: 15.3, CA: 31.0, NY: 24.5, FL: 15.2, CO: 15.0, WA: 12.0 };
export async function GET(req) {
  const state = (new URL(req.url).searchParams.get('state') || 'UT').toUpperCase();
  const key = process.env.EIA_API_KEY;
  if (!key)
    return NextResponse.json({
      state,
      centsPerKwh: fallback[state] || 16.5,
      source: 'Bundled state planning fallback',
      live: false,
      needsKey: 'EIA_API_KEY',
    });
  const u = new URL('https://api.eia.gov/v2/electricity/retail-sales/data/');
  u.searchParams.set('api_key', key);
  u.searchParams.append('data[]', 'price');
  u.searchParams.append('facets[sectorid][]', 'RES');
  u.searchParams.append('facets[stateid][]', state);
  u.searchParams.set('frequency', 'monthly');
  u.searchParams.set('sort[0][column]', 'period');
  u.searchParams.set('sort[0][direction]', 'desc');
  u.searchParams.set('length', '1');
  try {
    const r = await fetch(u, { next: { revalidate: 21600 } }),
      j = await r.json(),
      d = j?.response?.data?.[0];
    if (!d) throw new Error();
    return NextResponse.json({
      state,
      centsPerKwh: Number(d.price),
      period: d.period,
      source: 'U.S. EIA residential retail sales',
      live: true,
    });
  } catch {
    return NextResponse.json({
      state,
      centsPerKwh: fallback[state] || 16.5,
      source: 'Bundled fallback (EIA unavailable)',
      live: false,
    });
  }
}
