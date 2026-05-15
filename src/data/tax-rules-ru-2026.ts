import type { TaxRuleSet } from '../lib/tax-engine/types.ts';

export const TAX_RULES_RU_2026: TaxRuleSet = {
  year: 2026,
  currency: 'RUB',
  entities: {
    personalIndividual: 'ФЛ',
    individualEntrepreneurUsn6: 'ИП на УСН 6%',
    personalFoundation: 'Личный фонд',
    personalFoundationWithZpif: 'Личный фонд + ЗПИФ'
  },
  progressiveNdfl: {
    threshold: 2_400_000,
    lowerRate: 0.13,
    upperRate: 0.15
  },
  depositInterestExemptionMultiplier: 1_000_000,
  usnRate: 0.06,
  personalFoundationRate: 0.15,
  personalFoundationWithZpifRate: 0.15,
  articles: {
    personalNdfl: ['НК РФ ст. 224'],
    depositInterest: ['НК РФ ст. 214.2', 'НК РФ ст. 224'],
    realEstateSale: ['НК РФ ст. 217.1', 'НК РФ ст. 224'],
    entrepreneurUsn: ['НК РФ гл. 26.2', 'НК РФ ст. 346.20'],
    personalFoundation: ['НК РФ ст. 284.12'],
    zpif: ['НК РФ ст. 284.12', 'НК РФ правила налогообложения доходов владельца паев ЗПИФ']
  }
} as const;
