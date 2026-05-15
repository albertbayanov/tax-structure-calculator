import { TAX_RULES_RU_2026 } from '../../data/tax-rules-ru-2026.ts';
import { calculateTax } from './calculate.ts';
import type { RecommendationInput, RecommendationResult, TaxEntity } from './types.ts';

const DEFAULT_ENTITIES: readonly TaxEntity[] = [
  'personalIndividual',
  'individualEntrepreneurUsn6',
  'personalFoundation',
  'personalFoundationWithZpif'
] as const;

function formatRub(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2
  }).format(amount);
}

export function recommendTaxStructure(input: RecommendationInput): RecommendationResult {
  const entities = input.entities ?? [...DEFAULT_ENTITIES];
  const results = entities.map((entity) => calculateTax({ ...input, entity }));
  const applicableResults = results.filter((result) => result.isApplicable);

  if (applicableResults.length === 0) {
    return {
      recommendedEntity: null,
      recommendedEntityLabel: null,
      reason: 'Для выбранного типа дохода нет применимых структур в текущей модели.',
      results,
      warnings: results.flatMap((result) => result.warnings)
    };
  }

  const best = applicableResults.reduce((currentBest, candidate) => {
    if (candidate.taxAmount < currentBest.taxAmount) {
      return candidate;
    }

    if (candidate.taxAmount === currentBest.taxAmount && candidate.netIncome > currentBest.netIncome) {
      return candidate;
    }

    return currentBest;
  });

  return {
    recommendedEntity: best.entity,
    recommendedEntityLabel: TAX_RULES_RU_2026.entities[best.entity],
    reason: `${TAX_RULES_RU_2026.entities[best.entity]} — минимальный налог среди применимых структур: ${formatRub(best.taxAmount)}.`,
    results,
    warnings: results.flatMap((result) => result.warnings)
  };
}
