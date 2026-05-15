export interface ParsedAmount {
  value: number | null;
  isEmpty: boolean;
}

const RUB_SYMBOL_PATTERN = /₽|руб\.?/giu;
const GROUP_SEPARATOR_PATTERN = /[\s_']/gu;

export function parseHumanAmount(input: string): ParsedAmount {
  const withoutCurrency = input.replace(RUB_SYMBOL_PATTERN, '');
  const normalized = withoutCurrency
    .replace(GROUP_SEPARATOR_PATTERN, '')
    .replace(',', '.')
    .trim();

  if (normalized === '') {
    return { value: null, isEmpty: true };
  }

  if (!/^-?\d+(?:\.\d+)?$/u.test(normalized)) {
    return { value: Number.NaN, isEmpty: false };
  }

  const parsed = Number(normalized);
  return { value: Number.isFinite(parsed) ? parsed : Number.NaN, isEmpty: false };
}
