import { TAX_RULES_RU_2026 } from '../../data/tax-rules-ru-2026.ts';
import type { TaxCalculationInput, TaxCalculationResult } from './types.ts';

function roundRub(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function calculateZpifTax(input: TaxCalculationInput): TaxCalculationResult {
  const taxableBase = Math.max(0, input.grossIncome);
  const taxAmount = roundRub(taxableBase * TAX_RULES_RU_2026.personalFoundationWithZpifRate);

  return {
    entity: 'personalFoundationWithZpif',
    entityLabel: TAX_RULES_RU_2026.entities.personalFoundationWithZpif,
    incomeType: input.incomeType,
    isApplicable: true,
    taxableBase: roundRub(taxableBase),
    taxAmount,
    effectiveRate: input.grossIncome > 0 ? taxAmount / input.grossIncome : 0,
    netIncome: roundRub(input.grossIncome - taxAmount),
    appliedRate: '15%',
    appliedArticles: TAX_RULES_RU_2026.articles.zpif,
    formulaText: 'tax = income received by the personal foundation from ZPIF units × 15%',
    assumptions: [
      'The personal foundation owns ZPIF units.',
      'The calculated income is income received by the personal foundation from ZPIF units.',
      'Securities activity happens inside the ZPIF and is not calculated as direct securities activity of the foundation.'
    ],
    warnings: [
      'Check Article 284.12 requirements, including the 90% income test, before relying on the 15% personal-foundation rate.',
      'This engine does not calculate tax events inside the ZPIF; it calculates only tax on income received by the foundation from ZPIF units.'
    ]
  };
}
