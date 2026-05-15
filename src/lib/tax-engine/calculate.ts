import { calculateEntrepreneurRealEstateTax } from './entrepreneur-real-estate-tax.ts';
import { calculatePersonalFundTax } from './personal-fund-tax.ts';
import { calculatePersonalIncomeTax } from './personal-income-tax.ts';
import { calculateZpifTax } from './zpif-tax.ts';
import type { TaxCalculationInput, TaxCalculationResult } from './types.ts';

export function calculateTax(input: TaxCalculationInput): TaxCalculationResult {
  if (!Number.isFinite(input.grossIncome)) {
    throw new Error('grossIncome must be a finite number.');
  }

  if (input.grossIncome < 0) {
    throw new Error('grossIncome must not be negative.');
  }

  if (input.maxKeyRatePercent !== undefined && input.maxKeyRatePercent < 0) {
    throw new Error('maxKeyRatePercent must not be negative.');
  }

  switch (input.entity) {
    case 'personalIndividual':
      return calculatePersonalIncomeTax(input);
    case 'individualEntrepreneurUsn6':
      return calculateEntrepreneurRealEstateTax(input);
    case 'personalFoundation':
      return calculatePersonalFundTax(input);
    case 'personalFoundationWithZpif':
      return calculateZpifTax(input);
  }
}
