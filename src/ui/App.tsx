import { useMemo, useState } from 'react';
import { TAX_RULES_RU_2026 } from '../data/tax-rules-ru-2026.ts';
import { calculateTax } from '../lib/tax-engine/calculate.ts';
import { recommendTaxStructure } from '../lib/tax-engine/recommendation.ts';
import type { IncomeType, TaxCalculationInput, TaxCalculationResult, TaxEntity } from '../lib/tax-engine/types.ts';

const incomeTypeLabels: Record<IncomeType, string> = {
  depositInterest: 'Проценты по вкладам',
  dividends: 'Дивиденды',
  shareSale: 'Продажа акций',
  bondCoupon: 'Купоны по облигациям',
  bondSaleOrRedemption: 'Продажа или погашение облигаций',
  realEstateRent: 'Аренда недвижимости',
  realEstateSale: 'Продажа недвижимости'
};

const incomeTypeHints: Record<IncomeType, string> = {
  depositInterest: 'Учитывается необлагаемый лимит, зависящий от максимальной ключевой ставки за год.',
  dividends: 'Расчёт по прогрессивной ставке НДФЛ для налогового резидента РФ.',
  shareSale: 'Доход трактуется как налогооблагаемый финансовый результат текущего года.',
  bondCoupon: 'Купонный доход считается по прогрессивной ставке НДФЛ.',
  bondSaleOrRedemption: 'Доход трактуется как налогооблагаемый результат продажи или погашения.',
  realEstateRent: 'Можно сравнить НДФЛ, ИП на УСН и фондовые структуры.',
  realEstateSale: 'Важны минимальный срок владения и связь объекта с предпринимательской деятельностью.'
};

const entityDescriptions: Record<TaxEntity, string> = {
  personalIndividual: 'НДФЛ физического лица',
  individualEntrepreneurUsn6: 'УСН 6% для операций с недвижимостью',
  personalFoundation: 'Ставка 15% при выполнении условий',
  personalFoundationWithZpif: 'Фонд получает доход от паёв ЗПИФ'
};

const incomeTypeOptions = Object.entries(incomeTypeLabels) as Array<[IncomeType, string]>;
const entityOptions = Object.entries(TAX_RULES_RU_2026.entities) as Array<[TaxEntity, string]>;

const rubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0
});

const preciseRubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'percent',
  maximumFractionDigits: 2
});

function parseAmount(value: string): number {
  const normalized = value.replace(',', '.').trim();
  if (normalized === '') {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function formatRub(amount: number): string {
  return Number.isInteger(amount) ? rubFormatter.format(amount) : preciseRubFormatter.format(amount);
}

function validateInput(input: TaxCalculationInput): string | null {
  if (!Number.isFinite(input.grossIncome)) {
    return 'Введите корректную сумму дохода.';
  }

  if (input.grossIncome < 0) {
    return 'Сумма дохода не может быть отрицательной.';
  }

  if (!Number.isFinite(input.maxKeyRatePercent ?? 0)) {
    return 'Введите корректную максимальную ключевую ставку.';
  }

  if ((input.maxKeyRatePercent ?? 0) < 0) {
    return 'Ключевая ставка не может быть отрицательной.';
  }

  return null;
}

function getFormulaText(result: TaxCalculationResult, input: TaxCalculationInput): string {
  if (!result.isApplicable) {
    return 'Эта структура не применяется к выбранному типу дохода в текущей модели.';
  }

  if (result.entity === 'personalIndividual' && input.incomeType === 'depositInterest') {
    const exemption = 1_000_000 * ((input.maxKeyRatePercent ?? 0) / 100);
    return `Необлагаемый лимит: 1 000 000 ₽ × ${input.maxKeyRatePercent ?? 0}% = ${formatRub(exemption)}. Налоговая база: доход минус лимит, но не ниже нуля. Налог: 13% до 2 400 000 ₽ базы и 15% сверх этой суммы.`;
  }

  if (result.entity === 'personalIndividual' && input.incomeType === 'realEstateSale' && input.minimumHoldingPeriodMet) {
    return 'Налог равен нулю, потому что отмечено соблюдение минимального срока владения.';
  }

  if (result.entity === 'personalIndividual') {
    return 'Налог: 13% с базы до 2 400 000 ₽ и 15% с части базы сверх 2 400 000 ₽.';
  }

  if (result.entity === 'individualEntrepreneurUsn6') {
    return 'Налог: доход от применимой операции с недвижимостью × 6%.';
  }

  if (result.entity === 'personalFoundation') {
    return 'Налог: валовый доход личного фонда × 15%.';
  }

  return 'Налог: доход, полученный личным фондом от паёв ЗПИФ, × 15%.';
}

function getWarningText(warning: string): string {
  const translations = new Map<string, string>([
    ['maxKeyRatePercent was not provided; deposit-interest exemption was calculated as 0 RUB.', 'Максимальная ключевая ставка не указана, поэтому необлагаемый лимит по вкладам принят равным 0 ₽.'],
    ['minimumHoldingPeriodMet was not provided; sale was treated as taxable.', 'Минимальный срок владения не указан, поэтому продажа недвижимости считается налогооблагаемой.'],
    ['ИП is not applicable to investment income types in this calculator scope.', 'ИП на УСН не применяется к инвестиционным доходам в текущей версии калькулятора.'],
    ['isBusinessRealEstate was not provided; sale was treated as business real estate.', 'Статус недвижимости не указан, поэтому продажа считается связанной с предпринимательской деятельностью.'],
    ['Check Article 284.12 requirements, including the 90% income test, before relying on the 15% personal-foundation rate.', 'Перед применением ставки 15% для личного фонда проверьте выполнение требований статьи 284.12 НК РФ, включая долю доходов.'],
    ['This engine does not calculate tax events inside the ZPIF; it calculates only tax on income received by the foundation from ZPIF units.', 'Калькулятор не считает налоговые события внутри ЗПИФ, а показывает только налог с дохода, полученного фондом от паёв.']
  ]);

  return translations.get(warning) ?? 'Проверьте применимость выбранной структуры и исходных данных перед использованием результата.';
}

function getRateText(result: TaxCalculationResult): string {
  if (!result.isApplicable || result.appliedRate === 'not applicable') {
    return 'Не применяется';
  }

  return result.appliedRate
    .replace('13% up to 2,400,000 RUB; 15% above 2,400,000 RUB', '13% до 2 400 000 ₽; 15% сверх 2 400 000 ₽')
    .replace('0% because the applicable minimum holding period is met', '0%, потому что соблюдён минимальный срок владения');
}

function getRecommendationText(results: TaxCalculationResult[], recommendedEntity: TaxEntity | null): string {
  const applicableResults = results.filter((result) => result.isApplicable);
  if (applicableResults.length === 0 || recommendedEntity === null) {
    return 'Для выбранного типа дохода нет применимых структур в текущей модели.';
  }

  const best = applicableResults.find((result) => result.entity === recommendedEntity);
  if (!best) {
    return 'Заполните параметры, чтобы увидеть рекомендацию.';
  }

  return `${best.entityLabel}: минимальный налог среди применимых вариантов — ${formatRub(best.taxAmount)}.`;
}

function sortResults(results: TaxCalculationResult[]): TaxCalculationResult[] {
  return [...results].sort((first, second) => {
    if (first.isApplicable !== second.isApplicable) {
      return first.isApplicable ? -1 : 1;
    }

    return first.taxAmount - second.taxAmount;
  });
}

export function App() {
  const [entity, setEntity] = useState<TaxEntity>('personalIndividual');
  const [incomeType, setIncomeType] = useState<IncomeType>('dividends');
  const [grossIncome, setGrossIncome] = useState('5000000');
  const [maxKeyRatePercent, setMaxKeyRatePercent] = useState('18');
  const [minimumHoldingPeriodMet, setMinimumHoldingPeriodMet] = useState(false);
  const [isBusinessRealEstate, setIsBusinessRealEstate] = useState(true);

  const input = useMemo<TaxCalculationInput>(() => ({
    entity,
    incomeType,
    grossIncome: parseAmount(grossIncome),
    maxKeyRatePercent: parseAmount(maxKeyRatePercent),
    minimumHoldingPeriodMet,
    isBusinessRealEstate
  }), [entity, grossIncome, incomeType, isBusinessRealEstate, maxKeyRatePercent, minimumHoldingPeriodMet]);

  const calculation = useMemo(() => {
    const validationError = validateInput(input);
    if (validationError) {
      return { error: validationError } as const;
    }

    try {
      return { result: calculateTax(input) } as const;
    } catch {
      return { error: 'Не удалось выполнить расчёт. Проверьте введённые значения.' } as const;
    }
  }, [input]);

  const recommendation = useMemo(() => {
    const validationError = validateInput(input);
    if (validationError) {
      return null;
    }

    try {
      return recommendTaxStructure({
        incomeType,
        grossIncome: input.grossIncome,
        maxKeyRatePercent: input.maxKeyRatePercent ?? 0,
        minimumHoldingPeriodMet,
        isBusinessRealEstate
      });
    } catch {
      return null;
    }
  }, [incomeType, input, isBusinessRealEstate, minimumHoldingPeriodMet]);

  const sortedResults = useMemo(
    () => sortResults(recommendation?.results ?? []),
    [recommendation]
  );

  const selectedResult = 'result' in calculation ? calculation.result : null;
  const shouldShowKeyRate = incomeType === 'depositInterest';
  const shouldShowHoldingPeriod = incomeType === 'realEstateSale';
  const shouldShowBusinessRealEstate = incomeType === 'realEstateRent' || incomeType === 'realEstateSale';

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Налоговая модель РФ · 2026</p>
          <h1>Калькулятор налоговой структуры</h1>
          <p className="hero-text">
            Введите доход один раз и сразу сравните физлицо, ИП на УСН, личный фонд и связку с ЗПИФ.
          </p>
          <div className="hero-steps" aria-label="Как пользоваться калькулятором">
            <span>1. Выберите доход</span>
            <span>2. Уточните параметры</span>
            <span>3. Сравните налог</span>
          </div>
        </div>

        <aside className="summary-card" aria-label="Рекомендация калькулятора">
          <span className="summary-label">Лучший вариант</span>
          <strong>{recommendation?.recommendedEntityLabel ?? 'Пока не выбран'}</strong>
          <p>{recommendation ? getRecommendationText(recommendation.results, recommendation.recommendedEntity) : 'Заполните параметры, чтобы увидеть рекомендацию.'}</p>
        </aside>
      </section>

      <section className="workspace-grid">
        <form className="panel form-panel" onSubmit={(event) => event.preventDefault()}>
          <div className="section-heading">
            <span>Шаг 1</span>
            <h2>Исходные данные</h2>
            <p>Оставили только поля, которые влияют на выбранный тип дохода.</p>
          </div>

          <label className="field">
            <span>Валовый доход</span>
            <input
              aria-describedby="gross-income-hint"
              inputMode="decimal"
              min="0"
              type="number"
              value={grossIncome}
              onChange={(event) => setGrossIncome(event.target.value)}
            />
            <small id="gross-income-hint">Сумма до удержания налога, в рублях.</small>
          </label>

          <fieldset className="choice-group">
            <legend>Тип дохода</legend>
            <div className="choice-grid income-grid">
              {incomeTypeOptions.map(([value, label]) => (
                <button
                  aria-pressed={incomeType === value}
                  className="choice-card"
                  key={value}
                  type="button"
                  onClick={() => setIncomeType(value)}
                >
                  <strong>{label}</strong>
                  <span>{incomeTypeHints[value]}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {shouldShowKeyRate && (
            <label className="field">
              <span>Максимальная ключевая ставка за год</span>
              <input
                aria-describedby="key-rate-hint"
                inputMode="decimal"
                min="0"
                step="0.01"
                type="number"
                value={maxKeyRatePercent}
                onChange={(event) => setMaxKeyRatePercent(event.target.value)}
              />
              <small id="key-rate-hint">Нужна для расчёта необлагаемого лимита по процентам на вклады.</small>
            </label>
          )}

          {shouldShowHoldingPeriod && (
            <label className="switch-row">
              <input
                type="checkbox"
                checked={minimumHoldingPeriodMet}
                onChange={(event) => setMinimumHoldingPeriodMet(event.target.checked)}
              />
              <span>
                <strong>Минимальный срок владения соблюдён</strong>
                <small>Если да, продажа недвижимости для физлица считается освобождённой от налога.</small>
              </span>
            </label>
          )}

          {shouldShowBusinessRealEstate && (
            <label className="switch-row">
              <input
                type="checkbox"
                checked={isBusinessRealEstate}
                onChange={(event) => setIsBusinessRealEstate(event.target.checked)}
              />
              <span>
                <strong>Объект связан с предпринимательской деятельностью</strong>
                <small>Влияет на применимость ИП на УСН при операциях с недвижимостью.</small>
              </span>
            </label>
          )}

          <fieldset className="choice-group">
            <legend>Подробный расчёт для структуры</legend>
            <div className="choice-grid entity-grid">
              {entityOptions.map(([value, label]) => (
                <button
                  aria-pressed={entity === value}
                  className="choice-card"
                  key={value}
                  type="button"
                  onClick={() => setEntity(value)}
                >
                  <strong>{label}</strong>
                  <span>{entityDescriptions[value]}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </form>

        <section className="result-column" aria-live="polite">
          <section className="panel result-panel">
            <div className="section-heading compact-heading">
              <span>Шаг 2</span>
              <h2>Расчёт выбранной структуры</h2>
            </div>

            {'error' in calculation ? (
              <div className="error-box">{calculation.error}</div>
            ) : (
              <>
                <div className="result-title-row">
                  <div>
                    <span className="muted-label">Структура</span>
                    <h3>{calculation.result.entityLabel}</h3>
                  </div>
                  <span className={calculation.result.isApplicable ? 'status-pill success' : 'status-pill neutral'}>
                    {calculation.result.isApplicable ? 'Применимо' : 'Не применяется'}
                  </span>
                </div>

                <div className="metrics-grid">
                  <article className="metric-card primary-metric">
                    <span>Налог</span>
                    <strong>{formatRub(calculation.result.taxAmount)}</strong>
                  </article>
                  <article className="metric-card">
                    <span>Чистый доход</span>
                    <strong>{formatRub(calculation.result.netIncome)}</strong>
                  </article>
                  <article className="metric-card">
                    <span>Налоговая база</span>
                    <strong>{formatRub(calculation.result.taxableBase)}</strong>
                  </article>
                  <article className="metric-card">
                    <span>Эффективная ставка</span>
                    <strong>{percentFormatter.format(calculation.result.effectiveRate)}</strong>
                  </article>
                </div>

                <div className="details-card">
                  <h3>Как считается</h3>
                  <p>{getFormulaText(calculation.result, input)}</p>
                </div>

                <div className="details-card">
                  <h3>Ставка и нормы</h3>
                  <p>{getRateText(calculation.result)}</p>
                  <ul>
                    {calculation.result.appliedArticles.map((article) => (
                      <li key={article}>{article}</li>
                    ))}
                  </ul>
                </div>

                {calculation.result.warnings.length > 0 && (
                  <div className="warning-box">
                    <h3>На что обратить внимание</h3>
                    <ul>
                      {calculation.result.warnings.map((warning) => (
                        <li key={warning}>{getWarningText(warning)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>

          {recommendation && selectedResult && (
            <section className="panel comparison-panel">
              <div className="section-heading compact-heading">
                <span>Шаг 3</span>
                <h2>Сравнение всех вариантов</h2>
                <p>Сначала показаны применимые структуры с меньшей суммой налога.</p>
              </div>

              <div className="comparison-list">
                {sortedResults.map((result) => (
                  <article
                    className={result.entity === recommendation.recommendedEntity ? 'comparison-card best-card' : 'comparison-card'}
                    key={result.entity}
                  >
                    <div>
                      <span className="muted-label">{result.isApplicable ? 'Можно использовать' : 'Не подходит'}</span>
                      <h3>{result.entityLabel}</h3>
                    </div>
                    <div className="comparison-values">
                      <span>{formatRub(result.taxAmount)}</span>
                      <small>налог · чистый доход {formatRub(result.netIncome)}</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>
      </section>

      <section className="disclaimer">
        <strong>Важно:</strong> калькулятор не является налоговой, юридической или инвестиционной консультацией.
        Перед принятием решений проверьте расчёт и применимость налоговых правил с профильным специалистом.
      </section>
    </main>
  );
}
