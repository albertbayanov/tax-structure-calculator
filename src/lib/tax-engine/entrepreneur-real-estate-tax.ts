import { TAX_RULES_RU_2026 } from '../../data/tax-rules-ru-2026.ts';
import { calculatePersonalIncomeTax } from './personal-income-tax.ts';
import type { IncomeType, TaxCalculationInput, TaxCalculationResult } from './types.ts';

const INVESTMENT_INCOME_TYPES: readonly IncomeType[] = [
  'depositInterest',
  'dividends',
  'shareSale',
  'bondCoupon',
  'bondSaleOrRedemption'
] as const;

function roundRub(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function calculateEntrepreneurRealEstateTax(input: TaxCalculationInput): TaxCalculationResult {
  const assumptions = [
    'Individual entrepreneur applies simplified taxation system (УСН) with 6% income object.',
    'ИП treatment is limited to Russian real estate rent and Russian real estate sale.',
    'No deductions or expenses are applied.'
  ];

  if (INVESTMENT_INCOME_TYPES.includes(input.incomeType)) {
    return {
      entity: 'individualEntrepreneurUsn6',
      entityLabel: TAX_RULES_RU_2026.entities.individualEntrepreneurUsn6,
      incomeType: input.incomeType,
      isApplicable: false,
      taxableBase: 0,
      taxAmount: 0,
      effectiveRate: 0,
      netIncome: input.grossIncome,
      appliedRate: 'not applicable',
      appliedArticles: TAX_RULES_RU_2026.articles.entrepreneurUsn,
      formulaText: 'ИП on УСН 6% applies only to realEstateRent and realEstateSale in this engine.',
      assumptions,
      warnings: ['ИП is not applicable to investment income types in this calculator scope.']
    };
  }

  if (input.incomeType === 'realEstateSale' && input.isBusinessRealEstate === false) {
    const personalResult = calculatePersonalIncomeTax({ ...input, entity: 'personalIndividual' });
    return {
      ...personalResult,
      entity: 'individualEntrepreneurUsn6',
      entityLabel: TAX_RULES_RU_2026.entities.individualEntrepreneurUsn6,
      assumptions: [
        ...assumptions,
        'Real estate is marked as non-business property, so ФЛ real-estate sale logic is used.'
      ],
      warnings: personalResult.warnings
    };
  }

  const taxableBase = Math.max(0, input.grossIncome);
  const taxAmount = roundRub(taxableBase * TAX_RULES_RU_2026.usnRate);
  const formulaText = input.incomeType === 'realEstateRent'
    ? 'tax = gross real estate rent income × 6%'
    : 'tax = business real estate sale income × 6%';

  return {
    entity: 'individualEntrepreneurUsn6',
    entityLabel: TAX_RULES_RU_2026.entities.individualEntrepreneurUsn6,
    incomeType: input.incomeType,
    isApplicable: true,
    taxableBase: roundRub(taxableBase),
    taxAmount,
    effectiveRate: input.grossIncome > 0 ? taxAmount / input.grossIncome : 0,
    netIncome: roundRub(input.grossIncome - taxAmount),
    appliedRate: '6%',
    appliedArticles: TAX_RULES_RU_2026.articles.entrepreneurUsn,
    formulaText,
    assumptions,
    warnings: input.incomeType === 'realEstateSale' && input.isBusinessRealEstate === undefined
      ? ['isBusinessRealEstate was not provided; sale was treated as business real estate.']
      : []
  };
}
