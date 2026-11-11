const taxSchedules = {
  single: {
    standardDeduction: 16100,
    brackets: [
      [12400, 0.1],
      [50400, 0.12],
      [105700, 0.22],
      [201775, 0.24],
      [256225, 0.32],
      [640600, 0.35],
      [Infinity, 0.37],
    ],
  },
  marriedFilingJointly: {
    standardDeduction: 32200,
    brackets: [
      [24800, 0.1],
      [100800, 0.12],
      [211400, 0.22],
      [403550, 0.24],
      [512450, 0.32],
      [768700, 0.35],
      [Infinity, 0.37],
    ],
  },
  marriedFilingSeparately: {
    standardDeduction: 16100,
    brackets: [
      [12400, 0.1],
      [50400, 0.12],
      [105700, 0.22],
      [201775, 0.24],
      [256225, 0.32],
      [384350, 0.35],
      [Infinity, 0.37],
    ],
  },
  headOfHousehold: {
    standardDeduction: 24150,
    brackets: [
      [17700, 0.1],
      [67450, 0.12],
      [105700, 0.22],
      [201750, 0.24],
      [256200, 0.32],
      [640600, 0.35],
      [Infinity, 0.37],
    ],
  },
};

const stateTaxRates = { UT: 0.0455, TX: 0, CA: 0.06, NY: 0.055, FL: 0, CO: 0.044 };

export function stateIncomeTaxRate(state) {
  return stateTaxRates[state] ?? 0.045;
}

export function estimateHomesteadTaxSavings({
  state,
  propertyValue,
  propertyTaxRate,
  schoolTaxRate,
}) {
  const value = Math.max(0, Number(propertyValue) || 0);
  const totalRate = Math.max(0, Number(propertyTaxRate) || 0);
  const schoolRate = Math.min(totalRate, Math.max(0, Number(schoolTaxRate) || 0));
  const annualPropertyTax = (value * totalRate) / 100;

  switch (state) {
    case 'TX':
      return {
        amount: Math.min(annualPropertyTax, (Math.min(value, 140000) * schoolRate) / 100),
        label: 'Texas residence homestead exemption',
        details:
          'Applies the $140,000 school-district exemption using the entered school tax rate, which starts at a 1% planning assumption. Replace it with your local rate. Optional local exemptions are not included.',
        source: 'https://comptroller.texas.gov/taxes/property-tax/exemptions/',
      };
    case 'UT':
      return {
        amount: annualPropertyTax * 0.45,
        label: 'Utah primary residential exemption',
        details:
          'Estimates the 45% primary-residence taxable-value exemption. Eligibility and county approval are assumed.',
        source: 'https://tax.utah.gov/propertytax/tax-relief/primary-residential-exemption/',
      };
    case 'CA':
      return {
        amount: (Math.min(value, 7000) * totalRate) / 100,
        label: 'California homeowners’ exemption',
        details:
          'Estimates the $7,000 assessed-value reduction for a qualifying owner-occupied principal residence.',
        source: 'https://www.boe.ca.gov/proptaxes/homeowners_exemption.htm',
      };
    case 'FL': {
      const firstExemption = Math.min(value, 25000);
      const additionalExemption = Math.min(Math.max(0, value - 50000), 25000);
      return {
        amount: (firstExemption * totalRate + additionalExemption * (totalRate - schoolRate)) / 100,
        label: 'Florida homestead exemption',
        details:
          'Estimates the first $25,000 exemption for all levies and the next eligible $25,000 for non-school levies. The school tax rate starts at a 1% planning assumption; replace it with your local rate.',
        source:
          'https://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0196/Sections/0196.031.html',
      };
    }
    case 'NY':
      return {
        amount: 0,
        label: 'New York STAR benefit not estimated',
        details:
          'STAR depends on eligibility, income, school district, and the actual school tax bill.',
        source: 'https://www.tax.ny.gov/pit/property/star/eligibility.htm',
      };
    case 'CO':
      return {
        amount: 0,
        label: 'No general Colorado homestead exemption estimated',
        details:
          'No general homestead exemption is modeled. Additional programs require separate eligibility details.',
        source: null,
      };
    default:
      return {
        amount: 0,
        label: 'No state exemption estimate available',
        details: 'No homestead savings are included for this state.',
        source: null,
      };
  }
}

export function standardDeductionFor(status) {
  return taxSchedules[status]?.standardDeduction ?? taxSchedules.single.standardDeduction;
}

export function federalIncomeTax(taxableIncome, status) {
  const { brackets } = taxSchedules[status] ?? taxSchedules.single;
  const income = Math.max(0, Number(taxableIncome) || 0);
  let tax = 0;
  let lower = 0;

  for (const [upper, rate] of brackets) {
    const taxableInBracket = Math.max(0, Math.min(income, upper) - lower);
    tax += taxableInBracket * rate;
    if (income <= upper) break;
    lower = upper;
  }

  return tax;
}

export function annualMortgageInterest(principal, annualRate, termYears) {
  const amount = Math.max(0, Number(principal) || 0);
  const monthlyRate = Math.max(0, Number(annualRate) || 0) / 1200;
  const months = Math.max(1, Number(termYears) || 1) * 12;

  if (!amount || !monthlyRate) return 0;

  const payment =
    (amount * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
  let balance = amount;
  let interestPaid = 0;

  for (let month = 0; month < Math.min(12, months); month += 1) {
    const interest = balance * monthlyRate;
    interestPaid += interest;
    balance -= payment - interest;
  }

  return interestPaid;
}

export function estimateHomeTaxBenefits({
  incomeBeforeDeductions,
  filingStatus,
  federalCredits = 0,
  w4Deductions = 0,
  stateIncomeTax = 0,
  propertyTax = 0,
  mortgageInterest = 0,
  mortgageBalance = 0,
}) {
  const status = taxSchedules[filingStatus] ? filingStatus : 'single';
  const standardDeduction = standardDeductionFor(status);
  const income = Math.max(0, Number(incomeBeforeDeductions) || 0);
  const credit = Math.max(0, Number(federalCredits) || 0);
  const otherDeductions = Math.max(0, Number(w4Deductions) || 0);
  const incomeTax = (deduction) =>
    Math.max(0, federalIncomeTax(income - deduction, status) - credit);

  const isMfs = status === 'marriedFilingSeparately';
  const saltCap = isMfs ? 20000 : 40000;
  const saltPhaseoutStart = isMfs ? 250000 : 500000;
  const saltMinimum = isMfs ? 5000 : 10000;
  const adjustedSaltCap = Math.max(
    saltMinimum,
    saltCap - Math.max(0, income - saltPhaseoutStart) * 0.3,
  );
  const stateTaxes = Math.max(0, Number(stateIncomeTax) || 0);
  const propertyTaxes = Math.max(0, Number(propertyTax) || 0);
  const deductionFloor = standardDeduction + otherDeductions;
  const baseDeduction = Math.max(deductionFloor, Math.min(adjustedSaltCap, stateTaxes));
  const withPropertyDeduction = Math.max(
    deductionFloor,
    Math.min(adjustedSaltCap, stateTaxes + propertyTaxes),
  );

  const balance = Math.max(0, Number(mortgageBalance) || 0);
  const debtLimit = isMfs ? 375000 : 750000;
  const eligibleMortgageInterest =
    Math.max(0, Number(mortgageInterest) || 0) * (balance ? Math.min(1, debtLimit / balance) : 0);
  const withMortgageOnlyDeduction = Math.max(
    deductionFloor,
    Math.min(adjustedSaltCap, stateTaxes) + eligibleMortgageInterest,
  );
  const withBothDeductions = Math.max(
    deductionFloor,
    Math.min(adjustedSaltCap, stateTaxes + propertyTaxes) + eligibleMortgageInterest,
  );

  const taxWithoutHomeDeductions = incomeTax(baseDeduction);
  const taxWithPropertyDeduction = incomeTax(withPropertyDeduction);
  const taxWithMortgageDeduction = incomeTax(withMortgageOnlyDeduction);
  const taxWithBothDeductions = incomeTax(withBothDeductions);

  return {
    propertyTaxBenefit:
      (Math.max(0, taxWithoutHomeDeductions - taxWithPropertyDeduction) +
        Math.max(0, taxWithMortgageDeduction - taxWithBothDeductions)) /
      2,
    mortgageInterestBenefit:
      (Math.max(0, taxWithoutHomeDeductions - taxWithMortgageDeduction) +
        Math.max(0, taxWithPropertyDeduction - taxWithBothDeductions)) /
      2,
    eligibleMortgageInterest,
  };
}
