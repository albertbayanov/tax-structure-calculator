import { describe, expect, it } from './vitest-shim.ts';
import { parseHumanAmount } from '../../../ui/amount.ts';

describe('parseHumanAmount', () => {
  it('treats empty input as empty value', () => {
    const result = parseHumanAmount('');

    expect(result.isEmpty).toBe(true);
    expect(result.value).toBeNull();
  });

  it('parses zero income', () => {
    const result = parseHumanAmount('0');

    expect(result.isEmpty).toBe(false);
    expect(result.value).toBe(0);
  });

  it('parses amount with spaces and ruble sign', () => {
    const result = parseHumanAmount('5 000 000 ₽');

    expect(result.isEmpty).toBe(false);
    expect(result.value).toBe(5_000_000);
  });

  it('parses decimal comma', () => {
    const result = parseHumanAmount('18,5');

    expect(result.isEmpty).toBe(false);
    expect(result.value).toBe(18.5);
  });

  it('preserves negative values for field-level validation', () => {
    const result = parseHumanAmount('-1 000');

    expect(result.isEmpty).toBe(false);
    expect(result.value).toBe(-1000);
  });
});
