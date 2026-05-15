import { TAX_RULES_RU_2026 } from '../../data/tax-rules-ru-2026.ts';
import type { IncomeType, TaxCalculationInput, TaxCalculationResult } from './types.ts';

const INVESTMENT_INCOME_TYPES: readonly IncomeType[] = [
  'dividends',
  'shareSale',
  'bondCoupon',
  'bondSaleOrRedemption'
] as const;

function roundRub(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function effectiveRate(taxAmount: number, grossIncome: number): number {
  return grossIncome > 0 ? taxAmount / grossIncome : 0;
}

export function calculateProgressiveNdfl(taxableBase: number): number {
  const { lowerRate, threshold, upperRate } = TAX_RULES_RU_2026.progressiveNdfl;
  if (taxableBase <= threshold) {
    return roundRub(taxableBase * lowerRate);
  }

  return roundRub(threshold * lowerRate + (taxableBase - threshold) * upperRate);
}

export function calculatePersonalIncomeTax(input: TaxCalculationInput): TaxCalculationResult {
  const assumptions = [
    'Taxpayer is a Russian tax resident.',
    'Only Russian-source income and Russian assets are considered.',
    'No broker commissions, prior-year losses, long-term securities deduction, accrued coupon income, cadastral-value rule, acquisition-cost deduction, or 1 million RUB real-estate deduction are applied.'
  ];
  const warnings: string[] = [];
  let taxableBase = Math.max(0, input.grossIncome);
  let taxAmount = 0;
  let appliedRate = '13% up to 2,400,000 RUB; 15% above 2,400,000 RUB';
  let appliedArticles = TAX_RULES_RU_2026.articles.personalNdfl;
  let formulaText = 'tax = 13% × min(taxableBase, 2,400,000) + 15% × max(0, taxableBase - 2,400,000)';

  if (input.incomeType === 'depositInterest') {
    const maxKeyRatePercent = input.maxKeyRatePercent ?? 0;
    const exemption = TAX_RULES_RU_2026.depositInterestExemptionMultiplier * (maxKeyRatePercent / 100);
    taxableBase = Math.max(0, input.grossIncome - exemption);
    appliedArticles = TAX_RULES_RU_2026.articles.depositInterest;
    formulaText = `exemption = 1,000,000 × ${maxKeyRatePercent}% = ${roundRub(exemption)} RUB; taxableBase = max(0, grossIncome - exemption); tax = progressive NDFL on taxableBase`;

    if (input.maxKeyRatePercent === undefined) {
      warnings.push('maxKeyRatePercent was not provided; deposit-interest exemption was calculated as 0 RUB.');
    }
  } else if (input.incomeType === 'realEstateSale') {
    appliedArticles = TAX_RULES_RU_2026.articles.realEstateSale;
    if (input.minimumHoldingPeriodMet === true) {
      taxableBase = 0;
      appliedRate = '0% because the applicable minimum holding period is met';
      formulaText = 'tax = 0 because the applicable minimum holding period is met';
    } else {
      taxableBase = Math.max(0, input.grossIncome);
      formulaText = 'taxableBase = gross sale income; tax = progressive NDFL on taxableBase';
      if (input.minimumHoldingPeriodMet === undefined) {
        warnings.push('minimumHoldingPeriodMet was not provided; sale was treated as taxable.');
      }
    }
  } else if (input.incomeType === 'realEstateRent' || INVESTMENT_INCOME_TYPES.includes(input.incomeType)) {
    taxableBase = Math.max(0, input.grossIncome);
  }

  taxAmount = calculateProgressiveNdfl(taxableBase);

  return {
    entity: 'personalIndividual',
    entityLabel: TAX_RULES_RU_2026.entities.personalIndividual,
    incomeType: input.incomeType,
    isApplicable: true,
    taxableBase: roundRub(taxableBase),
    taxAmount,
    effectiveRate: effectiveRate(taxAmount, input.grossIncome),
    netIncome: roundRub(input.grossIncome - taxAmount),
    appliedRate,
    appliedArticles,
    formulaText,
    assumptions,
    warnings
  };
}
