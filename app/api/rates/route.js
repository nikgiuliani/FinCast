import { NextResponse } from 'next/server';
export async function GET() {
  try {
    const r = await fetch('https://www.freddiemac.com/pmms', { next: { revalidate: 21600 } });
    const t = await r.text();
    const m30 = t.match(/30-year Fixed-Rate Mortgage[\s\S]{0,1200}?([0-9]+\.[0-9]+)%/i);
    const m15 = t.match(/15-year Fixed-Rate Mortgage[\s\S]{0,1200}?([0-9]+\.[0-9]+)%/i);
    if (!m30) throw new Error();
    return NextResponse.json({
      conventional30: Number(m30[1]),
      conventional15: m15 ? Number(m15[1]) : null,
      source: 'Freddie Mac PMMS',
      live: true,
    });
  } catch {
    return NextResponse.json({
      conventional30: 7.18,
      conventional15: 6.57,
      source: 'Bundled Freddie Mac snapshot (Nov 5, 2026)',
      live: false,
    });
  }
}
