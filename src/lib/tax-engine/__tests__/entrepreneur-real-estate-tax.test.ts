import { describe, expect, it } from './vitest-shim.ts';
import { calculateTax } from '../calculate.ts';

describe('individual entrepreneur real estate tax', () => {
  it('calculates USN 6% tax for real estate rent', () => {
    const result = calculateTax({
      entity: 'individualEntrepreneurUsn6',
      incomeType: 'realEstateRent',
      grossIncome: 1_000_000
    });

    expect(result.isApplicable).toBe(true);
    expect(result.taxableBase).toBe(1_000_000);
    expect(result.taxAmount).toBe(60_000);
    expect(result.effectiveRate).toBe(0.06);
  });

  it('calculates USN 6% tax for business real estate sale', () => {
    const result = calculateTax({
      entity: 'individualEntrepreneurUsn6',
      incomeType: 'realEstateSale',
      grossIncome: 5_000_000,
      isBusinessRealEstate: true
    });

    expect(result.isApplicable).toBe(true);
    expect(result.taxAmount).toBe(300_000);
    expect(result.formulaText).toContain('business real estate sale income');
  });

  it('uses personal individual real estate sale logic for non-business real estate', () => {
    const result = calculateTax({
      entity: 'individualEntrepreneurUsn6',
      incomeType: 'realEstateSale',
      grossIncome: 5_000_000,
      isBusinessRealEstate: false,
      minimumHoldingPeriodMet: true
    });

    expect(result.isApplicable).toBe(true);
    expect(result.taxAmount).toBe(0);
    expect(result.assumptions).toContain('Real estate is marked as non-business property, so ФЛ real-estate sale logic is used.');
  });

  it.each(['depositInterest', 'dividends', 'shareSale', 'bondCoupon', 'bondSaleOrRedemption'] as const)(
    'marks %s as not applicable',
    (incomeType) => {
      const result = calculateTax({
        entity: 'individualEntrepreneurUsn6',
        incomeType,
        grossIncome: 1_000_000
      });

      expect(result.isApplicable).toBe(false);
      expect(result.taxAmount).toBe(0);
      expect(result.warnings.join(' ')).toContain('not applicable to investment income');
    }
  );
});
