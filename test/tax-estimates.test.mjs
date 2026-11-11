import assert from 'node:assert/strict';
import test from 'node:test';
import {
  annualMortgageInterest,
  estimateHomeTaxBenefits,
  estimateHomesteadTaxSavings,
  federalIncomeTax,
  stateIncomeTaxRate,
  standardDeductionFor,
} from '../app/tax-estimates.mjs';

test('uses the 2026 standard deduction for each filing status', () => {
  assert.equal(standardDeductionFor('single'), 16100);
  assert.equal(standardDeductionFor('marriedFilingJointly'), 32200);
  assert.equal(standardDeductionFor('marriedFilingSeparately'), 16100);
  assert.equal(standardDeductionFor('headOfHousehold'), 24150);
});

test('calculates federal tax progressively', () => {
  assert.equal(federalIncomeTax(12400, 'single'), 1240);
  assert.equal(federalIncomeTax(22400, 'single'), 2440);
  assert.equal(federalIncomeTax(24800, 'marriedFilingJointly'), 2480);
});

test('keeps no-income-tax states at zero instead of using the unknown-state fallback', () => {
  assert.equal(stateIncomeTaxRate('TX'), 0);
  assert.equal(stateIncomeTaxRate('FL'), 0);
  assert.equal(stateIncomeTaxRate('UT'), 0.0455);
  assert.equal(stateIncomeTaxRate('unknown'), 0.045);
});

test('estimates Texas homestead savings only against school district tax', () => {
  const savings = estimateHomesteadTaxSavings({
    state: 'TX',
    propertyValue: 500000,
    propertyTaxRate: 2,
    schoolTaxRate: 1,
  });
  assert.equal(savings.amount, 1400);

  const districtRateExceedsTheEstimatedOverallRate = estimateHomesteadTaxSavings({
    state: 'TX',
    propertyValue: 500000,
    propertyTaxRate: 0.5,
    schoolTaxRate: 0.9252,
  });
  assert.equal(districtRateExceedsTheEstimatedOverallRate.amount, 1295.28);

  const capped = estimateHomesteadTaxSavings({
    state: 'TX',
    propertyValue: 100000,
    propertyTaxRate: 0.5,
    schoolTaxRate: 1,
  });
  assert.equal(capped.amount, 500);
});

test('estimates Utah, California, and Florida state homestead exemptions', () => {
  assert.equal(
    estimateHomesteadTaxSavings({
      state: 'UT',
      propertyValue: 500000,
      propertyTaxRate: 1,
    }).amount,
    2250,
  );
  assert.equal(
    estimateHomesteadTaxSavings({
      state: 'CA',
      propertyValue: 500000,
      propertyTaxRate: 1,
    }).amount,
    70,
  );
  assert.equal(
    estimateHomesteadTaxSavings({
      state: 'FL',
      propertyValue: 500000,
      propertyTaxRate: 2,
      schoolTaxRate: 1,
    }).amount,
    750,
  );
});

test('does not imply a statewide exemption estimate for states without a modeled general exemption', () => {
  assert.equal(
    estimateHomesteadTaxSavings({
      state: 'NY',
      propertyValue: 500000,
      propertyTaxRate: 2,
    }).amount,
    0,
  );
  assert.equal(
    estimateHomesteadTaxSavings({
      state: 'CO',
      propertyValue: 500000,
      propertyTaxRate: 2,
    }).amount,
    0,
  );
});

test('estimates first-year mortgage interest', () => {
  assert.ok(Math.abs(annualMortgageInterest(300000, 6, 30) - 17903) < 10);
  assert.equal(annualMortgageInterest(300000, 0, 30), 0);
});

test('only reports an itemized home tax benefit above the standard deduction', () => {
  const benefit = estimateHomeTaxBenefits({
    incomeBeforeDeductions: 120000,
    filingStatus: 'single',
    stateIncomeTax: 5000,
    propertyTax: 3000,
    mortgageInterest: 12000,
    mortgageBalance: 300000,
  });
  assert.ok(benefit.propertyTaxBenefit > 0);
  assert.ok(benefit.mortgageInterestBenefit > 0);
});

test('does not estimate a home tax benefit when deductions remain below the standard deduction', () => {
  const benefit = estimateHomeTaxBenefits({
    incomeBeforeDeductions: 120000,
    filingStatus: 'single',
    stateIncomeTax: 4000,
    propertyTax: 2000,
    mortgageInterest: 4000,
    mortgageBalance: 200000,
  });
  assert.equal(benefit.propertyTaxBenefit, 0);
  assert.equal(benefit.mortgageInterestBenefit, 0);
});

test('limits deductible mortgage interest to qualified acquisition debt', () => {
  const benefit = estimateHomeTaxBenefits({
    incomeBeforeDeductions: 200000,
    filingStatus: 'single',
    mortgageInterest: 40000,
    mortgageBalance: 1500000,
  });
  assert.equal(benefit.eligibleMortgageInterest, 20000);
});
