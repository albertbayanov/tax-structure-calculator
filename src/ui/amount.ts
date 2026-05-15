export interface ParsedAmount {
  value: number | null;
  isEmpty: boolean;
}

const RUB_SYMBOL_PATTERN = /₽|руб\.?/giu;
const GROUP_SEPARATOR_PATTERN = /[\s_']/gu;

function normalizeSeparators(input: string): string {
  const commaCount = (input.match(/,/gu) ?? []).length;
  const dotCount = (input.match(/\./gu) ?? []).length;

  if (commaCount > 0 && dotCount > 0) {
    const lastCommaIndex = input.lastIndexOf(',');
    const lastDotIndex = input.lastIndexOf('.');
    const decimalSeparator = lastCommaIndex > lastDotIndex ? ',' : '.';
    const groupSeparator = decimalSeparator === ',' ? '.' : ',';
    return input.replaceAll(groupSeparator, '').replace(decimalSeparator, '.');
  }

  if (commaCount > 1) {
    return input.replaceAll(',', '');
  }

  if (dotCount > 1) {
    return input.replaceAll('.', '');
  }

  if (commaCount === 1) {
    const [integerPart, fractionPart] = input.split(',');
    if (fractionPart?.length === 3 && integerPart !== undefined && /^-?\d{1,3}$/u.test(integerPart)) {
      return `${integerPart}${fractionPart}`;
    }

    return input.replace(',', '.');
  }

  if (dotCount === 1) {
    const [integerPart, fractionPart] = input.split('.');
    if (fractionPart?.length === 3 && integerPart !== undefined && /^-?\d{1,3}$/u.test(integerPart)) {
      return `${integerPart}${fractionPart}`;
    }
  }

  return input;
}

export function parseHumanAmount(input: string): ParsedAmount {
  const withoutCurrency = input.replace(RUB_SYMBOL_PATTERN, '');
  const compact = withoutCurrency.replace(GROUP_SEPARATOR_PATTERN, '').trim();
  const normalized = normalizeSeparators(compact);

  if (normalized === '') {
    return { value: null, isEmpty: true };
  }

  if (!/^-?\d+(?:\.\d+)?$/u.test(normalized)) {
    return { value: Number.NaN, isEmpty: false };
  }

  const parsed = Number(normalized);
  return { value: Number.isFinite(parsed) ? parsed : Number.NaN, isEmpty: false };
}
