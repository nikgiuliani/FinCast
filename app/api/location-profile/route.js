import { NextResponse } from 'next/server';
const profiles = {
  UT: { gas: [45, 105], water: [45, 90], sewer: [30, 65], trash: [18, 35], internet: [45, 85] },
  TX: { gas: [35, 85], water: [55, 125], sewer: [35, 75], trash: [20, 40], internet: [45, 90] },
  CA: { gas: [45, 120], water: [65, 150], sewer: [35, 90], trash: [30, 65], internet: [50, 95] },
  FL: { gas: [15, 55], water: [50, 115], sewer: [35, 80], trash: [20, 45], internet: [45, 90] },
  NY: { gas: [70, 170], water: [35, 85], sewer: [35, 85], trash: [20, 45], internet: [50, 95] },
};
export async function GET(req) {
  const state = (new URL(req.url).searchParams.get('state') || 'UT').toUpperCase();
  return NextResponse.json({
    state,
    ...(profiles[state] || {
      gas: [45, 110],
      water: [50, 110],
      sewer: [35, 75],
      trash: [20, 45],
      internet: [50, 90],
    }),
    source: 'FinCast regional planning ranges',
    live: false,
  });
}
