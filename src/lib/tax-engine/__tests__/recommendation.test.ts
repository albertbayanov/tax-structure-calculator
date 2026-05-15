import { describe, expect, it } from './vitest-shim.ts';
import { recommendTaxStructure } from '../recommendation.ts';

describe('recommendTaxStructure', () => {
  it('recommends the lowest tax applicable entity', () => {
    const recommendation = recommendTaxStructure({
      incomeType: 'realEstateRent',
      grossIncome: 1_000_000
    });

    expect(recommendation.recommendedEntity).toBe('individualEntrepreneurUsn6');
    expect(recommendation.recommendedEntityLabel).toBe('ИП на УСН 6%');
    expect(recommendation.results).toHaveLength(4);
  });

  it('ignores non-applicable entities', () => {
    const recommendation = recommendTaxStructure({
      incomeType: 'dividends',
      grossIncome: 1_000_000,
      entities: ['individualEntrepreneurUsn6', 'personalFoundation']
    });

    expect(recommendation.results[0]?.isApplicable).toBe(false);
    expect(recommendation.recommendedEntity).toBe('personalFoundation');
  });

  it('returns no recommendation if no entity is applicable', () => {
    const recommendation = recommendTaxStructure({
      incomeType: 'shareSale',
      grossIncome: 1_000_000,
      entities: ['individualEntrepreneurUsn6']
    });

    expect(recommendation.recommendedEntity).toBeNull();
    expect(recommendation.reason).toContain('No selected entity is applicable');
  });
});
