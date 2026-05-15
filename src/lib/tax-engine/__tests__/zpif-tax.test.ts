import { describe, expect, it } from './vitest-shim.ts';
import { calculateTax } from '../calculate.ts';

describe('personal foundation with ZPIF tax', () => {
  it('calculates 15% tax on income from ZPIF units', () => {
    const result = calculateTax({
      entity: 'personalFoundationWithZpif',
      incomeType: 'bondCoupon',
      grossIncome: 2_000_000
    });

    expect(result.isApplicable).toBe(true);
    expect(result.taxableBase).toBe(2_000_000);
    expect(result.taxAmount).toBe(300_000);
    expect(result.formulaText).toContain('income received by the personal foundation from ZPIF units');
    expect(result.assumptions.join(' ')).toContain('Securities activity happens inside the ZPIF');
  });
});
