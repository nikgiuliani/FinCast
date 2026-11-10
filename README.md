# HomePay Live

Next.js version of HomePay with instant local calculations plus free/open-data integrations.

## Run

1. Install Node.js 20.9+.
2. `npm install`
3. Copy `.env.example` to `.env.local`.
4. Optional: add free `EIA_API_KEY` and `NREL_API_KEY`.
5. `npm run dev`
6. Open http://localhost:3000

## Production

Run `npm run build` to create the production build, then `npm run start` to serve it. Both commands require Node.js 20.9+.

## Live/free integrations

- U.S. Census Geocoder: address matching, coordinates, county/state/ZIP; no key.
- Freddie Mac PMMS: current conventional benchmark rate refresh; no user key.
- U.S. EIA: current state residential electricity price; free API key required.
- NREL PVWatts v8: solar production estimate; free API key required.
- HUD FHA MIP rules are calculated locally from published rules.

## Intentional fallbacks

Water/sewer/trash/gas/internet and payroll withholding use clearly labeled planning models where there is no dependable nationwide free public API. The app continues to work if external APIs are unavailable.

## Scenario toggles

The final monthly housing tally includes independent **Utilities** and **Projects** checkboxes. Unchecking either excludes that category from total housing, remaining take-home, and income-consumption percentage without deleting the underlying estimate or project inputs.
