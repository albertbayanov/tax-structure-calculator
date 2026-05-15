export type TaxEntity =
  | 'personalIndividual'
  | 'individualEntrepreneurUsn6'
  | 'personalFoundation'
  | 'personalFoundationWithZpif';

export type IncomeType =
  | 'depositInterest'
  | 'dividends'
  | 'shareSale'
  | 'bondCoupon'
  | 'bondSaleOrRedemption'
  | 'realEstateRent'
  | 'realEstateSale';

export type RubAmount = number;

export interface TaxCalculationInput {
  entity: TaxEntity;
  incomeType: IncomeType;
  /** Gross RUB income for the selected income type. For securities sales this engine treats it as current-year taxable economic result. */
  grossIncome: RubAmount;
  /** Required for personal individual deposit interest exemption. */
  maxKeyRatePercent?: number;
  /** Required for real estate sale scenarios. */
  minimumHoldingPeriodMet?: boolean;
  /** Required for individual entrepreneur real estate sale scenarios. */
  isBusinessRealEstate?: boolean;
}

export interface TaxCalculationResult {
  entity: TaxEntity;
  entityLabel: string;
  incomeType: IncomeType;
  isApplicable: boolean;
  taxableBase: RubAmount;
  taxAmount: RubAmount;
  effectiveRate: number;
  netIncome: RubAmount;
  appliedRate: string;
  appliedArticles: string[];
  formulaText: string;
  assumptions: string[];
  warnings: string[];
}

export interface RecommendationInput extends Omit<TaxCalculationInput, 'entity'> {
  entities?: TaxEntity[];
}

export interface RecommendationResult {
  recommendedEntity: TaxEntity | null;
  recommendedEntityLabel: string | null;
  reason: string;
  results: TaxCalculationResult[];
  warnings: string[];
}

export interface ProgressiveTaxBracket {
  threshold: RubAmount;
  lowerRate: number;
  upperRate: number;
}

export interface TaxRuleSet {
  year: 2026;
  currency: 'RUB';
  entities: Record<TaxEntity, string>;
  progressiveNdfl: ProgressiveTaxBracket;
  depositInterestExemptionMultiplier: RubAmount;
  usnRate: number;
  personalFoundationRate: number;
  personalFoundationWithZpifRate: number;
  articles: {
    personalNdfl: string[];
    depositInterest: string[];
    realEstateSale: string[];
    entrepreneurUsn: string[];
    personalFoundation: string[];
    zpif: string[];
  };
}
