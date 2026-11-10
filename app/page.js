'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  annualMortgageInterest,
  estimateHomeTaxBenefits,
  federalIncomeTax,
  standardDeductionFor,
} from './tax-estimates.mjs';
const money = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
const mortgage = (p, a, y) => {
  const r = a / 1200,
    n = y * 12;
  return p <= 0 ? 0 : r ? (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : p / n;
};
function Badge({ live, children }) {
  return (
    <span className={'badge ' + (live ? '' : 'estimate')}>
      {live ? 'LIVE' : 'ESTIMATE'} · {children}
    </span>
  );
}
function Field({ label, children, wide = false }) {
  return (
    <div className={'field ' + (wide ? 'wide' : '')}>
      <label>{label}</label>
      {children}
    </div>
  );
}
function Row({ k, v }) {
  return (
    <div className="row">
      <span className="muted">{k}</span>
      <b>{v}</b>
    </div>
  );
}
export default function Page() {
  const [tab, setTab] = useState('pay');
  const [darkMode, setDarkMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const [salary, setSalary] = useState(120000),
    [state, setState] = useState('UT'),
    [freq, setFreq] = useState(26),
    [filingStatus, setFilingStatus] = useState('single'),
    [childrenUnder17, setChildrenUnder17] = useState(0),
    [otherDependents, setOtherDependents] = useState(0),
    [otherIncome, setOtherIncome] = useState(0),
    [w4Deductions, setW4Deductions] = useState(0),
    [extraWithholding, setExtraWithholding] = useState(0),
    [retire, setRetire] = useState(5),
    [medical, setMedical] = useState(100),
    [otherPreTax, setOtherPreTax] = useState(0),
    [additionalDeductions, setAdditionalDeductions] = useState(0);
  const [address, setAddress] = useState('123 Main St, West Jordan, UT 84084'),
    [geo, setGeo] = useState(null),
    [geoStatus, setGeoStatus] = useState('Type an address, then refresh live location data.');
  const [price, setPrice] = useState(500000),
    [down, setDown] = useState(20),
    [loanType, setLoanType] = useState('conventional'),
    [rate, setRate] = useState(7.18),
    [term, setTerm] = useState(30),
    [taxRate, setTaxRate] = useState(1.0),
    [insurance, setInsurance] = useState(2400),
    [hoa, setHoa] = useState(0);
  const [includeUtilities, setIncludeUtilities] = useState(true),
    [includeProjects, setIncludeProjects] = useState(true);
  const [projectType, setProjectType] = useState('solar'),
    [projectCost, setProjectCost] = useState(25000),
    [projectRate, setProjectRate] = useState(8.5),
    [projectTerm, setProjectTerm] = useState(12);
  const [rates, setRates] = useState({
    conventional30: 7.18,
    conventional15: 6.57,
    source: 'Bundled snapshot',
    live: false,
  });
  const [energy, setEnergy] = useState({ centsPerKwh: 11.8, source: 'Fallback', live: false });
  const [profile, setProfile] = useState({
    gas: [45, 105],
    water: [45, 90],
    sewer: [30, 65],
    trash: [18, 35],
    internet: [45, 85],
    source: 'Planning ranges',
    live: false,
  });
  const [usage, setUsage] = useState('typical');
  const [solar, setSolar] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const savedMode = window.localStorage.getItem('homepay-dark-mode') === 'true';
    setDarkMode(savedMode);
    document.documentElement.dataset.theme = savedMode ? 'dark' : 'light';
  }, []);
  useEffect(() => {
    if (!settingsOpen) return;
    function closeSettings(event) {
      if (event.type === 'keydown' && event.key === 'Escape') {
        setSettingsOpen(false);
      } else if (event.type === 'pointerdown' && !settingsRef.current?.contains(event.target)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('pointerdown', closeSettings);
    document.addEventListener('keydown', closeSettings);
    return () => {
      document.removeEventListener('pointerdown', closeSettings);
      document.removeEventListener('keydown', closeSettings);
    };
  }, [settingsOpen]);
  const pay = useMemo(() => {
    const annualSalary = Math.max(0, Number(salary) || 0),
      periods = Math.max(1, Number(freq) || 1),
      gross = annualSalary / periods,
      ret = (gross * Math.max(0, Number(retire) || 0)) / 100,
      preTaxPerCheck =
        ret + Math.max(0, Number(medical) || 0) + Math.max(0, Number(otherPreTax) || 0),
      taxableWages = Math.max(0, annualSalary - preTaxPerCheck * periods),
      ficaWages = Math.max(0, annualSalary - Math.max(0, Number(medical) || 0) * periods),
      annualOtherIncome = Math.max(0, Number(otherIncome) || 0),
      annualW4Deductions = Math.max(0, Number(w4Deductions) || 0),
      dependentCredit =
        Math.max(0, Number(childrenUnder17) || 0) * 2200 +
        Math.max(0, Number(otherDependents) || 0) * 500,
      creditPhaseoutStart = filingStatus === 'marriedFilingJointly' ? 400000 : 200000,
      creditReduction =
        Math.ceil(Math.max(0, annualSalary + annualOtherIncome - creditPhaseoutStart) / 1000) * 50,
      federalCredits = Math.max(0, dependentCredit - creditReduction),
      federalTaxableIncome = Math.max(
        0,
        taxableWages + annualOtherIncome - standardDeductionFor(filingStatus) - annualW4Deductions,
      ),
      fedAnnual = Math.max(
        0,
        federalIncomeTax(federalTaxableIncome, filingStatus) - federalCredits,
      ),
      federalWithholding = fedAnnual / periods,
      extraWithholdingPerCheck = Math.max(0, Number(extraWithholding) || 0),
      fed = federalWithholding + extraWithholdingPerCheck,
      socialSecurity = (Math.min(ficaWages, 184500) * 0.062) / periods,
      medicare = (ficaWages * 0.0145 + Math.max(0, ficaWages - 200000) * 0.009) / periods,
      fica = socialSecurity + medicare,
      stateTaxRate = { UT: 0.0455, TX: 0, CA: 0.06, NY: 0.055, FL: 0, CO: 0.044 }[state] || 0.045,
      stateTax = (taxableWages * stateTaxRate) / periods,
      postTaxPerCheck = Math.max(0, Number(additionalDeductions) || 0),
      net = Math.max(0, gross - preTaxPerCheck - fed - fica - stateTax - postTaxPerCheck);
    return {
      gross,
      ret,
      preTaxPerCheck,
      monthly: (net * periods) / 12,
      per: net,
      fed,
      federalWithholding,
      extraWithholdingPerCheck,
      fica,
      socialSecurity,
      medicare,
      stateTax,
      postTaxPerCheck,
      federalCredits,
      incomeBeforeDeductions: taxableWages + annualOtherIncome,
    };
  }, [
    salary,
    state,
    freq,
    filingStatus,
    childrenUnder17,
    otherDependents,
    otherIncome,
    w4Deductions,
    extraWithholding,
    retire,
    medical,
    otherPreTax,
    additionalDeductions,
  ]);
  const util = useMemo(() => {
    const mult = usage === 'efficient' ? 0.75 : usage === 'high' ? 1.35 : 1,
      kwh = usage === 'efficient' ? 650 : usage === 'high' ? 1500 : 1000,
      electric = (kwh * energy.centsPerKwh) / 100;
    const mid = (x) => ((x?.[0] + x?.[1]) / 2) * mult;
    return {
      electric,
      gas: mid(profile.gas),
      water: mid(profile.water),
      sewer: mid(profile.sewer),
      trash: mid(profile.trash),
      internet: mid(profile.internet),
      total:
        electric +
        mid(profile.gas) +
        mid(profile.water) +
        mid(profile.sewer) +
        mid(profile.trash) +
        mid(profile.internet),
      kwh,
    };
  }, [usage, energy, profile]);
  const projectPayment = useMemo(
    () => mortgage(projectCost, projectRate, projectTerm),
    [projectCost, projectRate, projectTerm],
  );
  const home = useMemo(() => {
    const base = price * (1 - down / 100),
      ltv = price ? base / price : 0;
    let principal = base,
      mi = 0,
      ufmip = 0,
      miName = 'PMI';
    if (loanType === 'fha') {
      ufmip = base * 0.0175;
      principal += ufmip;
      const mr = term > 15 ? (ltv > 0.95 ? 0.0055 : 0.005) : ltv > 0.9 ? 0.004 : 0.0015;
      mi = (base * mr) / 12;
      miName = 'FHA MIP';
    } else if (ltv > 0.8) {
      const mr = ltv > 0.95 ? 0.01 : ltv > 0.9 ? 0.008 : ltv > 0.85 ? 0.006 : 0.0045;
      mi = (base * mr) / 12;
    }
    const pi = mortgage(principal, rate, term),
      tax = (price * taxRate) / 100 / 12,
      ins = insurance / 12,
      utilityIncluded = includeUtilities ? util.total : 0,
      projectsIncluded = includeProjects ? projectPayment : 0,
      grossTotal = pi + tax + ins + hoa + mi + utilityIncluded + projectsIncluded,
      annualInterest = annualMortgageInterest(principal, rate, term),
      taxBenefits = estimateHomeTaxBenefits({
        incomeBeforeDeductions: pay.incomeBeforeDeductions,
        filingStatus,
        federalCredits: pay.federalCredits,
        w4Deductions,
        stateIncomeTax: pay.stateTax * freq,
        propertyTax: tax * 12,
        mortgageInterest: annualInterest,
        mortgageBalance: principal,
      }),
      propertyTaxBenefit = taxBenefits.propertyTaxBenefit / 12,
      mortgageInterestBenefit = taxBenefits.mortgageInterestBenefit / 12,
      taxBenefit = propertyTaxBenefit + mortgageInterestBenefit,
      total = Math.max(0, grossTotal - taxBenefit);
    return {
      base,
      pi,
      tax,
      ins,
      mi,
      miName,
      ufmip,
      utilityIncluded,
      projectsIncluded,
      annualInterest,
      propertyTaxBenefit,
      mortgageInterestBenefit,
      taxBenefit,
      grossTotal,
      total,
      left: pay.monthly - total,
      ratio: pay.monthly ? total / pay.monthly : 0,
    };
  }, [
    price,
    down,
    loanType,
    rate,
    term,
    taxRate,
    insurance,
    hoa,
    util,
    pay.monthly,
    pay.incomeBeforeDeductions,
    pay.federalCredits,
    pay.stateTax,
    freq,
    filingStatus,
    w4Deductions,
    includeUtilities,
    includeProjects,
    projectPayment,
  ]);
  async function refresh() {
    setLoading(true);
    setGeoStatus('Refreshing public data…');
    try {
      const g = await fetch('/api/geocode?address=' + encodeURIComponent(address)).then((r) =>
        r.json(),
      );
      setGeo(g);
      const st = g.state || state;
      if (g.state) setState(g.state);
      setGeoStatus(
        g.matched
          ? `Matched ${g.matchedAddress}${g.county ? ' · ' + g.county : ''}`
          : 'No Census street-address match; using typed state/fallbacks.',
      );
      const [e, p, r] = await Promise.all([
        fetch('/api/energy?state=' + st).then((x) => x.json()),
        fetch('/api/location-profile?state=' + st).then((x) => x.json()),
        fetch('/api/rates').then((x) => x.json()),
      ]);
      setEnergy(e);
      setProfile(p);
      setRates(r);
      if (loanType === 'conventional' && r.conventional30) setRate(r.conventional30);
      if (g.coordinates) {
        const s = await fetch(`/api/solar?lat=${g.coordinates.y}&lon=${g.coordinates.x}&kw=8`).then(
          (x) => x.json(),
        );
        setSolar(s);
      }
    } catch {
      setGeoStatus('Live refresh failed; calculator is still using local fallbacks.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const t = setTimeout(() => {
      if (address.length > 12) refresh();
    }, 700);
    return () => clearTimeout(t);
  }, []);
  return (
    <main className="shell">
      <div className="top">
        <div className="brand">
          Fin<span>Cast</span>
        </div>
        <div className="tabs">
          <button className={tab === 'pay' ? 'active' : ''} onClick={() => setTab('pay')}>
            1 · Paycheck
          </button>
          <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>
            2 · Home
          </button>
        </div>
        <div className="settings" ref={settingsRef}>
          <button
            className="settingsButton"
            type="button"
            aria-label="Settings"
            aria-haspopup="true"
            aria-expanded={settingsOpen}
            aria-controls="settings-menu"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2.75v2.1m0 14.3v2.1M2.75 12h2.1m14.3 0h2.1M5.46 5.46l1.49 1.49m11.1 11.1 1.49 1.49m0-14.08-1.49 1.49m-11.1 11.1-1.49 1.49" />
            </svg>
          </button>
          {settingsOpen && (
            <div className="settingsMenu" id="settings-menu">
              <label className="settingsOption">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(event) => {
                    const nextMode = event.target.checked;
                    setDarkMode(nextMode);
                    window.localStorage.setItem('homepay-dark-mode', String(nextMode));
                    document.documentElement.dataset.theme = nextMode ? 'dark' : 'light';
                  }}
                />
                <span>Dark mode</span>
              </label>
            </div>
          )}
        </div>
      </div>
      {tab === 'pay' ? (
        <div className="grid">
          <section className="card hero">
            <div className="eyebrow">Paycheck calculator</div>
            <h1>Start with what actually reaches your bank account.</h1>
            <p className="muted">
              Enter your W-4 details and paycheck deductions for an estimated 2026 take-home amount.
            </p>
            <div className="fields">
              <Field label="Annual salary">
                <input type="number" value={salary} onChange={(e) => setSalary(+e.target.value)} />
              </Field>
              <Field label="Federal filing status">
                <select value={filingStatus} onChange={(e) => setFilingStatus(e.target.value)}>
                  <option value="single">Single</option>
                  <option value="marriedFilingJointly">Married filing jointly</option>
                  <option value="marriedFilingSeparately">Married filing separately</option>
                  <option value="headOfHousehold">Head of household</option>
                </select>
              </Field>
              <Field label="Work state (estimated)">
                <select value={state} onChange={(e) => setState(e.target.value)}>
                  {['UT', 'TX', 'CA', 'NY', 'FL', 'CO'].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Pay frequency">
                <select value={freq} onChange={(e) => setFreq(+e.target.value)}>
                  <option value="26">Biweekly (26)</option>
                  <option value="24">Semimonthly (24)</option>
                  <option value="12">Monthly</option>
                  <option value="52">Weekly</option>
                </select>
              </Field>
              <Field label="Qualifying children under 17">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={childrenUnder17}
                  onChange={(e) => setChildrenUnder17(+e.target.value)}
                />
              </Field>
              <Field label="Other qualifying dependents">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={otherDependents}
                  onChange={(e) => setOtherDependents(+e.target.value)}
                />
              </Field>
              <Field label="Other annual income (W-4)">
                <input
                  type="number"
                  min="0"
                  value={otherIncome}
                  onChange={(e) => setOtherIncome(+e.target.value)}
                />
              </Field>
              <Field label="Other annual deductions (W-4, above standard)">
                <input
                  type="number"
                  min="0"
                  value={w4Deductions}
                  onChange={(e) => setW4Deductions(+e.target.value)}
                />
              </Field>
              <Field label="Retirement / paycheck (%)">
                <input
                  type="number"
                  step=".5"
                  value={retire}
                  onChange={(e) => setRetire(+e.target.value)}
                />
              </Field>
              <Field label="Medical / paycheck">
                <input
                  type="number"
                  value={medical}
                  onChange={(e) => setMedical(+e.target.value)}
                />
              </Field>
              <Field label="Other pre-tax benefits / paycheck">
                <input
                  type="number"
                  min="0"
                  value={otherPreTax}
                  onChange={(e) => setOtherPreTax(+e.target.value)}
                />
              </Field>
              <Field label="Extra tax withholding / paycheck">
                <input
                  type="number"
                  min="0"
                  value={extraWithholding}
                  onChange={(e) => setExtraWithholding(+e.target.value)}
                />
              </Field>
            </div>
            <div className="divider" />
            <h2>Additional Deductions</h2>
            <p className="muted">Add other post-tax deductions taken from each paycheck.</p>
            <div className="fields">
              <Field label="Additional deductions / paycheck">
                <input
                  type="number"
                  min="0"
                  step=".01"
                  value={additionalDeductions}
                  onChange={(e) => setAdditionalDeductions(+e.target.value)}
                />
              </Field>
            </div>
            <div className="notice">
              Federal estimates use 2026 brackets and your filing details. State withholding uses
              simplified estimates for the listed states; local taxes and employer-specific payroll
              rules are not included.
            </div>
          </section>
          <aside className="stack">
            <div className="card">
              <h2>Estimated take-home</h2>
              <div className="metrics">
                <div className="metric">
                  <span className="tiny">Per paycheck</span>
                  <b>{money(pay.per)}</b>
                </div>
                <div className="metric">
                  <span className="tiny">Per month</span>
                  <b>{money(pay.monthly)}</b>
                </div>
              </div>
              <div className="divider" />
              <Row k="Federal income tax" v={`${money(pay.federalWithholding)}/check`} />
              <Row
                k="Extra federal withholding"
                v={`${money(pay.extraWithholdingPerCheck)}/check`}
              />
              <Row k="Social Security" v={`${money(pay.socialSecurity)}/check`} />
              <Row k="Medicare" v={`${money(pay.medicare)}/check`} />
              <Row k="State income tax (estimate)" v={`${money(pay.stateTax)}/check`} />
              <Row k="Retirement" v={`${money(pay.ret)}/check`} />
              <Row k="Medical" v={`${money(medical)}/check`} />
              <Row k="Other pre-tax benefits" v={`${money(otherPreTax)}/check`} />
              <Row k="Additional deductions" v={`${money(additionalDeductions)}/check`} />
              <Row k="Federal dependent credits" v={`${money(pay.federalCredits)}/year`} />
              <button className="btn takeHomeAction" onClick={() => setTab('home')}>
                Use this take-home →
              </button>
            </div>
          </aside>
        </div>
      ) : (
        <div className="grid">
          <section className="stack">
            <div className="card hero">
              <div className="eyebrow">Live location + mortgage</div>
              <h1>Turn an address into an all-in monthly cost.</h1>
              <div className="fields">
                <Field label="Property address" wide>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} />
                </Field>
              </div>
              <div className="inline" style={{ marginTop: 10 }}>
                <button className="btn secondary" onClick={refresh} disabled={loading}>
                  {loading ? 'Refreshing…' : 'Refresh live data'}
                </button>
                {geo?.source && <Badge live={geo.live}>{geo.source}</Badge>}
              </div>
              <p className="tiny">{geoStatus}</p>
              <div className="notice">
                {geo?.matched
                  ? `Location matched to ${[geo.city, geo.county && `${geo.county} County`, geo.state, geo.zip].filter(Boolean).join(', ')}. Address-specific exemptions and local credits are not verified; check the county assessor for programs you may qualify for.`
                  : 'Location-specific exemptions and local credits are not verified. A matched address can identify the jurisdiction, but eligibility depends on the property and owner.'}
              </div>
              <div className="fields">
                <Field label="Home price">
                  <input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} />
                </Field>
                <Field label="Down payment (%)">
                  <input
                    type="number"
                    step=".5"
                    value={down}
                    onChange={(e) => setDown(+e.target.value)}
                  />
                </Field>
                <Field label="Loan type">
                  <select
                    value={loanType}
                    onChange={(e) => {
                      setLoanType(e.target.value);
                      if (e.target.value === 'conventional') setRate(rates.conventional30 || rate);
                    }}
                  >
                    <option value="conventional">Conventional</option>
                    <option value="fha">FHA</option>
                  </select>
                </Field>
                <Field label="Mortgage rate (%)">
                  <input
                    type="number"
                    step=".01"
                    value={rate}
                    onChange={(e) => setRate(+e.target.value)}
                  />
                </Field>
                <Field label="Term">
                  <select value={term} onChange={(e) => setTerm(+e.target.value)}>
                    <option value="30">30 years</option>
                    <option value="15">15 years</option>
                  </select>
                </Field>
                <Field label="Property tax rate (%)">
                  <input
                    type="number"
                    step=".01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(+e.target.value)}
                  />
                </Field>
                <Field label="Insurance / year">
                  <input
                    type="number"
                    value={insurance}
                    onChange={(e) => setInsurance(+e.target.value)}
                  />
                </Field>
                <Field label="HOA / month">
                  <input type="number" value={hoa} onChange={(e) => setHoa(+e.target.value)} />
                </Field>
              </div>
              <div className="notice">
                {loanType === 'fha'
                  ? `FHA: ${money(home.ufmip)} upfront MIP is financed; monthly FHA MIP is ${money(home.mi)}.`
                  : home.mi
                    ? `Conventional PMI estimate: ${money(home.mi)}/month because down payment is below 20%.`
                    : 'No conventional PMI at 20%+ down.'}
              </div>
            </div>
            <div className="card">
              <div className="sourceLine">
                <h2 style={{ margin: 0 }}>Utilities</h2>
                <Badge live={energy.live}>{energy.source}</Badge>
              </div>
              <p className="muted">
                Electricity uses the latest EIA state residential price when an EIA key is
                configured. Other utilities use regional planning ranges until municipal/provider
                integrations are added.
              </p>
              <div className="fields">
                <Field label="Usage profile">
                  <select value={usage} onChange={(e) => setUsage(e.target.value)}>
                    <option value="efficient">Efficient</option>
                    <option value="typical">Typical</option>
                    <option value="high">High usage</option>
                  </select>
                </Field>
                <Field label="Electricity price">
                  <input
                    readOnly
                    value={`${energy.centsPerKwh?.toFixed?.(2) || energy.centsPerKwh}¢ / kWh`}
                  />
                </Field>
              </div>
              <div className="utilityGrid">
                <div className="utility">
                  <span className="tiny">Electricity · {util.kwh} kWh</span>
                  <b>{money(util.electric)}</b>
                </div>
                {[
                  ['Gas', util.gas],
                  ['Water', util.water],
                  ['Sewer', util.sewer],
                  ['Trash', util.trash],
                  ['Internet', util.internet],
                ].map(([k, v]) => (
                  <div className="utility" key={k}>
                    <span className="tiny">{k}</span>
                    <b>{money(v)}</b>
                  </div>
                ))}
              </div>
              <Row k="Utilities used in affordability" v={money(util.total) + '/mo'} />
              {solar && (
                <div className="notice good">
                  Solar:{' '}
                  {solar.live
                    ? `NREL PVWatts estimates ${Math.round(solar.annualKwh || 0).toLocaleString()} kWh/year for an 8 kW reference system.`
                    : solar.source}{' '}
                  <Badge live={solar.live}>{solar.source}</Badge>
                </div>
              )}
            </div>
            <div className="card">
              <h2>Home projects</h2>
              <p className="muted">
                Model a financed improvement without forcing it into the affordability total.
              </p>
              <div className="fields">
                <Field label="Project">
                  <select value={projectType} onChange={(e) => setProjectType(e.target.value)}>
                    <option value="solar">Solar panels</option>
                    <option value="roof">Roof replacement</option>
                    <option value="hvac">HVAC</option>
                    <option value="windows">Windows</option>
                    <option value="kitchen">Kitchen remodel</option>
                  </select>
                </Field>
                <Field label="Project cost">
                  <input
                    type="number"
                    value={projectCost}
                    onChange={(e) => setProjectCost(+e.target.value)}
                  />
                </Field>
                <Field label="Loan APR (%)">
                  <input
                    type="number"
                    step=".1"
                    value={projectRate}
                    onChange={(e) => setProjectRate(+e.target.value)}
                  />
                </Field>
                <Field label="Term (years)">
                  <input
                    type="number"
                    value={projectTerm}
                    onChange={(e) => setProjectTerm(+e.target.value)}
                  />
                </Field>
              </div>
              <Row k="Project loan payment" v={money(projectPayment) + '/mo'} />
            </div>
          </section>
          <aside className="stack">
            <div className={'profit ' + (home.left < 0 ? 'neg' : '')}>
              <div className="muted">Monthly take-home after selected housing costs</div>
              <strong>{money(home.left)}</strong>
              <div className="bar">
                <i style={{ width: Math.min(100, home.ratio * 100) + '%' }} />
              </div>
              <div className="muted">
                Selected housing costs use {(home.ratio * 100).toFixed(0)}% of take-home.
              </div>
            </div>
            <div className="card">
              <h2>All-in monthly housing</h2>
              <Row k="Principal + interest" v={money(home.pi)} />
              <Row k="Property tax" v={money(home.tax)} />
              <Row k="Insurance" v={money(home.ins)} />
              <Row k="HOA" v={money(hoa)} />
              <Row k={home.miName} v={money(home.mi)} />
              <div className="row">
                <label className="checkrow">
                  <input
                    type="checkbox"
                    checked={includeUtilities}
                    onChange={(e) => setIncludeUtilities(e.target.checked)}
                  />
                  <span>
                    <b>Utilities</b>
                    <small>{includeUtilities ? 'Included in total' : 'Excluded from total'}</small>
                  </span>
                </label>
                <b>{money(util.total)}</b>
              </div>
              <div className="row">
                <label className="checkrow">
                  <input
                    type="checkbox"
                    checked={includeProjects}
                    onChange={(e) => setIncludeProjects(e.target.checked)}
                  />
                  <span>
                    <b>Projects</b>
                    <small>{includeProjects ? 'Included in total' : 'Excluded from total'}</small>
                  </span>
                </label>
                <b>{money(projectPayment)}</b>
              </div>
              <Row k="Gross monthly housing cost" v={money(home.grossTotal)} />
              <Row
                k="Estimated property-tax deduction"
                v={`${money(-home.propertyTaxBenefit)}/mo`}
              />
              <Row
                k="Estimated mortgage-interest deduction"
                v={`${money(-home.mortgageInterestBenefit)}/mo`}
              />
              <Row k="Net monthly cost after estimated tax benefits" v={money(home.total)} />
              <div className="notice">
                Tax benefits are estimated federal tax savings from itemizing eligible property
                taxes and first-year mortgage interest, compared with your filing-status standard
                deduction. Property tax remains shown at its full estimated amount above. Local
                exemptions, credits, and eligibility are not verified.
              </div>
            </div>
            <div className="card">
              <div className="sourceLine">
                <h2 style={{ margin: 0 }}>Market rates</h2>
                <Badge live={rates.live}>{rates.source}</Badge>
              </div>
              <Row k="30-year conventional" v={(rates.conventional30 || '—') + '%'} />
              <Row k="15-year conventional" v={(rates.conventional15 || '—') + '%'} />
              <button
                className="btn secondary"
                onClick={() => setRate(rates.conventional30 || rate)}
              >
                Use 30-year benchmark
              </button>
              <div className="notice">
                FHA mortgage-insurance rules are modeled from HUD guidance. A free nationwide
                personalized FHA lender-quote API is not available here, so FHA rate remains
                user-entered rather than falsely labeled live.
              </div>
            </div>
          </aside>
        </div>
      )}
      <p className="tiny" style={{ marginTop: 18 }}>
        Data provenance: Census geocoding and Freddie Mac can refresh without user keys. EIA and
        NREL are optional free-key integrations. All fallback values are explicitly labeled
        estimates.
      </p>
    </main>
  );
}
