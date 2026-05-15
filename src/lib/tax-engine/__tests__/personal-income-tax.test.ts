import { describe, expect, it } from './vitest-shim.ts';
import { calculateTax } from '../calculate.ts';
import { calculateProgressiveNdfl } from '../personal-income-tax.ts';

const baseInput = {
  entity: 'personalIndividual' as const,
  grossIncome: 0
};

describe('personal income tax', () => {
  it('calculates progressive NDFL below and above threshold', () => {
    expect(calculateProgressiveNdfl(2_000_000)).toBe(260_000);
    expect(calculateProgressiveNdfl(3_000_000)).toBe(402_000);
  });

  it('applies deposit interest exemption from max key rate', () => {
    const result = calculateTax({
      ...baseInput,
      incomeType: 'depositInterest',
      grossIncome: 300_000,
      maxKeyRatePercent: 16
    });

    expect(result.isApplicable).toBe(true);
    expect(result.taxableBase).toBe(140_000);
    expect(result.taxAmount).toBe(18_200);
    expect(result.netIncome).toBe(281_800);
    expect(result.appliedArticles).toContain('НК РФ ст. 214.2');
  });

  it('uses zero deposit taxable base when exemption exceeds income', () => {
    const result = calculateTax({
      ...baseInput,
      incomeType: 'depositInterest',
      grossIncome: 100_000,
      maxKeyRatePercent: 16
    });

    expect(result.taxableBase).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });

  it.each(['dividends', 'shareSale', 'bondCoupon', 'bondSaleOrRedemption'] as const)(
    'taxes %s with progressive NDFL',
    (incomeType) => {
      const result = calculateTax({ ...baseInput, incomeType, grossIncome: 3_000_000 });

      expect(result.taxableBase).toBe(3_000_000);
      expect(result.taxAmount).toBe(402_000);
      expect(result.appliedRate).toContain('13%');
      expect(result.appliedRate).toContain('15%');
    }
  );

  it('exempts real estate sale when minimum holding period is met', () => {
    const result = calculateTax({
      ...baseInput,
      incomeType: 'realEstateSale',
      grossIncome: 10_000_000,
      minimumHoldingPeriodMet: true
    });

    expect(result.taxableBase).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.appliedRate).toContain('0%');
  });

  it('taxes gross real estate sale income when holding period is not met', () => {
    const result = calculateTax({
      ...baseInput,
      incomeType: 'realEstateSale',
      grossIncome: 10_000_000,
      minimumHoldingPeriodMet: false
    });

    expect(result.taxableBase).toBe(10_000_000);
    expect(result.taxAmount).toBe(1_452_000);
  });
});
