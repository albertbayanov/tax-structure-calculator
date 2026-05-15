import { describe, expect, it } from './vitest-shim.ts';
import { calculateTax } from '../calculate.ts';

describe('calculateTax validation and dispatch', () => {
  it('rejects negative gross income', () => {
    expect(() => calculateTax({
      entity: 'personalIndividual',
      incomeType: 'dividends',
      grossIncome: -1
    })).toThrow('grossIncome must not be negative');
  });

  it('rejects negative max key rate', () => {
    expect(() => calculateTax({
      entity: 'personalIndividual',
      incomeType: 'depositInterest',
      grossIncome: 1_000,
      maxKeyRatePercent: -1
    })).toThrow('maxKeyRatePercent must not be negative');
  });
});
