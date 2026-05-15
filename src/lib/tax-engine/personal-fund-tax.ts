import { TAX_RULES_RU_2026 } from '../../data/tax-rules-ru-2026.ts';
import type { TaxCalculationInput, TaxCalculationResult } from './types.ts';

function roundRub(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function calculatePersonalFundTax(input: TaxCalculationInput): TaxCalculationResult {
  const taxableBase = Math.max(0, input.grossIncome);
  const taxAmount = roundRub(taxableBase * TAX_RULES_RU_2026.personalFoundationRate);

  return {
    entity: 'personalFoundation',
    entityLabel: TAX_RULES_RU_2026.entities.personalFoundation,
    incomeType: input.incomeType,
    isApplicable: true,
    taxableBase: roundRub(taxableBase),
    taxAmount,
    effectiveRate: input.grossIncome > 0 ? taxAmount / input.grossIncome : 0,
    netIncome: roundRub(input.grossIncome - taxAmount),
    appliedRate: '15%',
    appliedArticles: TAX_RULES_RU_2026.articles.personalFoundation,
    formulaText: 'tax = gross income × 15%',
    assumptions: [
      'Personal foundation is a Russian personal foundation receiving Russian-source income.',
      'No expenses, deductions, or loss carryforwards are applied.'
    ],
    warnings: [
      'Check Article 284.12 requirements, including the 90% income test, before relying on the 15% personal-foundation rate.'
    ]
  };
}
