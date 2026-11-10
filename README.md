# FinCast

FinCast provides instant local paycheck and home affordability calculations plus free/open-data integrations.

## Run

1. Install Node.js 20.9+.
2. Enable Corepack with `corepack enable`, then install dependencies with `pnpm install`.
3. Copy `.env.example` to `.env.local`.
4. Optional: add free `EIA_API_KEY` and `NREL_API_KEY`.
5. `pnpm dev`
6. Open http://localhost:3000

## Production

Run `pnpm build` to create the production build, then `pnpm start` to serve it. Both commands require Node.js 20.9+.

Use pnpm for dependency changes (`pnpm add`, `pnpm add -D`, and `pnpm remove`) and commit `pnpm-lock.yaml` so installs stay reproducible.

## Live/free integrations

- U.S. Census Geocoder: address matching, coordinates, county/state/ZIP; no key.
- Freddie Mac PMMS: current conventional benchmark rate refresh; no user key.
- U.S. EIA: current state residential electricity price; free API key required.
- NREL PVWatts v8: solar production estimate; free API key required.
- HUD FHA MIP rules are calculated locally from published rules.

## Intentional fallbacks

Water/sewer/trash/gas/internet and state payroll withholding use clearly labeled planning models where there is no dependable nationwide free public API. Federal paycheck estimates use 2026 tax brackets and the entered filing status and W-4 adjustments; they are not a substitute for payroll software or tax advice.

The home summary estimates potential federal tax savings from deductible mortgage interest and property taxes, shown separately as negative monthly offsets. Property tax rates are user-entered estimates. Address matching identifies the county and ZIP code, but the app does not verify local homeowner exemptions, credits, or eligibility.

Federal standard deduction and rate references: [IRS tax-year 2026 adjustments](https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill). Mortgage-interest limits are modeled from [IRS Publication 936](https://www.irs.gov/publications/p936).

## Scenario toggles

The final monthly housing tally includes independent **Utilities** and **Projects** checkboxes. Unchecking either excludes that category from total housing, remaining take-home, and income-consumption percentage without deleting the underlying estimate or project inputs.
