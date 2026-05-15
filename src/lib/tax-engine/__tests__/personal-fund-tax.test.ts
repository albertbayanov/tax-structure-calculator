import { describe, expect, it } from './vitest-shim.ts';
import { calculateTax } from '../calculate.ts';

describe('personal foundation tax', () => {
  it('calculates 15% tax and includes Article 284.12 warning', () => {
    const result = calculateTax({
      entity: 'personalFoundation',
      incomeType: 'dividends',
      grossIncome: 2_000_000
    });

    expect(result.isApplicable).toBe(true);
    expect(result.taxableBase).toBe(2_000_000);
    expect(result.taxAmount).toBe(300_000);
    expect(result.appliedRate).toBe('15%');
    expect(result.appliedArticles).toContain('НК РФ ст. 284.12');
    expect(result.warnings.join(' ')).toContain('90% income test');
  });
});
