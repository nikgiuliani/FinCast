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
