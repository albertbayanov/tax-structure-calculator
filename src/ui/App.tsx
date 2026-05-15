import { useMemo, useState } from 'react';
import { TAX_RULES_RU_2026 } from '../data/tax-rules-ru-2026.ts';
import { recommendTaxStructure } from '../lib/tax-engine/recommendation.ts';
import type { IncomeType, RecommendationInput, TaxCalculationInput, TaxCalculationResult, TaxEntity } from '../lib/tax-engine/types.ts';
import { parseHumanAmount } from './amount.ts';

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
  depositInterest: 'Учитывается необлагаемый лимит, который зависит от максимальной ключевой ставки за год.',
  dividends: 'Сравним НДФЛ и фондовые структуры для распределяемого дохода.',
  shareSale: 'Доход считается налоговой базой текущего года без переноса убытков и вычетов.',
  bondCoupon: 'Купонный доход сравнивается по доступным структурам владения.',
  bondSaleOrRedemption: 'Доход трактуется как финансовый результат продажи или погашения.',
  realEstateRent: 'Для аренды можно сравнить физлицо, ИП на УСН и фондовые структуры.',
  realEstateSale: 'Ключевые параметры — минимальный срок владения и связь объекта с бизнесом.'
};

const entityDescriptions: Record<TaxEntity, string> = {
  personalIndividual: 'Базовый сценарий для сравнения экономии.',
  individualEntrepreneurUsn6: 'УСН 6% применяется только к операциям с недвижимостью в текущей модели.',
  personalFoundation: 'Модель считает ставку 15% при выполнении условий для личного фонда.',
  personalFoundationWithZpif: 'Модель считает налог у фонда с дохода от паёв ЗПИФ.'
};

const quickAmounts = [1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000] as const;
const incomeTypeOptions = Object.entries(incomeTypeLabels) as Array<[IncomeType, string]>;

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

interface FieldErrors {
  grossIncome?: string;
  maxKeyRatePercent?: string;
}

interface CalculatorState {
  incomeType: IncomeType;
  grossIncome: string;
  maxKeyRatePercent: string;
  minimumHoldingPeriodMet: boolean;
  isBusinessRealEstate: boolean;
}

function formatRub(amount: number): string {
  return Number.isInteger(amount) ? rubFormatter.format(amount) : preciseRubFormatter.format(amount);
}

function formatAmountButton(amount: number): string {
  if (amount >= 1_000_000) {
    return `${amount / 1_000_000} млн`;
  }

  return formatRub(amount);
}

function getFieldErrors(state: CalculatorState): FieldErrors {
  const errors: FieldErrors = {};
  const grossIncome = parseHumanAmount(state.grossIncome);

  if (grossIncome.isEmpty) {
    errors.grossIncome = 'Введите сумму дохода, например 5 000 000 ₽.';
  } else if (grossIncome.value === null || !Number.isFinite(grossIncome.value)) {
    errors.grossIncome = 'Используйте только цифры, пробелы, запятую или символ ₽.';
  } else if (grossIncome.value < 0) {
    errors.grossIncome = 'Доход не может быть отрицательным. Введите 0 или положительную сумму.';
  }

  if (state.incomeType === 'depositInterest') {
    const keyRate = parseHumanAmount(state.maxKeyRatePercent);
    if (!keyRate.isEmpty && (keyRate.value === null || !Number.isFinite(keyRate.value))) {
      errors.maxKeyRatePercent = 'Введите ставку числом, например 18 или 18,5.';
    } else if (keyRate.value !== null && keyRate.value < 0) {
      errors.maxKeyRatePercent = 'Ключевая ставка не может быть отрицательной.';
    }
  }

  return errors;
}

function hasFieldErrors(errors: FieldErrors): boolean {
  return errors.grossIncome !== undefined || errors.maxKeyRatePercent !== undefined;
}

function buildRecommendationInput(state: CalculatorState): RecommendationInput {
  const grossIncome = parseHumanAmount(state.grossIncome).value ?? 0;
  const maxKeyRate = parseHumanAmount(state.maxKeyRatePercent);
  const input: RecommendationInput = {
    incomeType: state.incomeType,
    grossIncome,
    minimumHoldingPeriodMet: state.minimumHoldingPeriodMet,
    isBusinessRealEstate: state.isBusinessRealEstate
  };

  if (state.incomeType === 'depositInterest' && maxKeyRate.value !== null && Number.isFinite(maxKeyRate.value)) {
    input.maxKeyRatePercent = maxKeyRate.value;
  }

  return input;
}

function getFormulaText(result: TaxCalculationResult, input: TaxCalculationInput): string {
  if (!result.isApplicable) {
    return 'Эта структура не применяется к выбранному типу дохода в текущей модели.';
  }

  if (result.entity === 'personalIndividual' && input.incomeType === 'depositInterest') {
    const exemption = 1_000_000 * ((input.maxKeyRatePercent ?? 0) / 100);
    return `Необлагаемый лимит: 1 000 000 ₽ × ${input.maxKeyRatePercent ?? 0}% = ${formatRub(exemption)}. Налоговая база — доход минус лимит, но не ниже нуля. Далее применяется прогрессивный НДФЛ.`;
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

function getAssumptionText(assumption: string): string {
  const translations = new Map<string, string>([
    ['Taxpayer is a Russian tax resident.', 'Налогоплательщик считается налоговым резидентом РФ.'],
    ['Only Russian-source income and Russian assets are considered.', 'Учитываются только доходы и активы в российской юрисдикции.'],
    ['No broker commissions, prior-year losses, long-term securities deduction, accrued coupon income, cadastral-value rule, acquisition-cost deduction, or 1 million RUB real-estate deduction are applied.', 'Комиссии, убытки прошлых лет, долгосрочные вычеты, НКД, кадастровое правило, расходы на приобретение и имущественный вычет 1 млн ₽ не применяются.'],
    ['Individual entrepreneur applies simplified taxation system (УСН) with 6% income object.', 'ИП применяет УСН с объектом «доходы» и ставкой 6%.'],
    ['ИП treatment is limited to Russian real estate rent and Russian real estate sale.', 'Режим ИП ограничен арендой и продажей российской недвижимости.'],
    ['No deductions or expenses are applied.', 'Расходы и вычеты не учитываются.'],
    ['Real estate is marked as non-business property, so ФЛ real-estate sale logic is used.', 'Недвижимость отмечена как не связанная с бизнесом, поэтому применена логика продажи для физлица.'],
    ['Personal foundation is a Russian personal foundation receiving Russian-source income.', 'Личный фонд считается российским личным фондом, получающим доход из российских источников.'],
    ['No expenses, deductions, or loss carryforwards are applied.', 'Расходы, вычеты и перенос убытков не применяются.'],
    ['The personal foundation owns ZPIF units.', 'Личный фонд владеет паями ЗПИФ.'],
    ['The calculated income is income received by the personal foundation from ZPIF units.', 'Расчётный доход — доход личного фонда от паёв ЗПИФ.'],
    ['Securities activity happens inside the ZPIF and is not calculated as direct securities activity of the foundation.', 'Операции с ценными бумагами происходят внутри ЗПИФ и не считаются прямыми операциями фонда.']
  ]);

  return translations.get(assumption) ?? assumption;
}

function getRateText(result: TaxCalculationResult): string {
  if (!result.isApplicable || result.appliedRate === 'not applicable') {
    return 'Не применяется';
  }

  return result.appliedRate
    .replace('13% up to 2,400,000 RUB; 15% above 2,400,000 RUB', '13% до 2 400 000 ₽; 15% сверх 2 400 000 ₽')
    .replace('0% because the applicable minimum holding period is met', '0%, потому что соблюдён минимальный срок владения');
}

function getRowStatus(result: TaxCalculationResult, isBest: boolean): string {
  if (isBest) {
    return 'Рекомендовано';
  }

  if (!result.isApplicable) {
    return result.warnings.length > 0 ? getWarningText(result.warnings[0] ?? '') : 'Не применимо к выбранному доходу.';
  }

  return 'Применимо, но налог выше лучшего варианта.';
}

function getSavings(result: TaxCalculationResult, personalResult: TaxCalculationResult | undefined): number | null {
  if (!personalResult?.isApplicable || !result.isApplicable) {
    return null;
  }

  return personalResult.taxAmount - result.taxAmount;
}

function formatSavings(value: number | null): string {
  if (value === null) {
    return '—';
  }

  if (value > 0) {
    return `+${formatRub(value)}`;
  }

  if (value < 0) {
    return `−${formatRub(Math.abs(value))}`;
  }

  return formatRub(0);
}

function sortResults(results: TaxCalculationResult[], recommendedEntity: TaxEntity | null): TaxCalculationResult[] {
  return [...results].sort((first, second) => {
    if (first.entity === recommendedEntity) {
      return -1;
    }

    if (second.entity === recommendedEntity) {
      return 1;
    }

    if (first.isApplicable !== second.isApplicable) {
      return first.isApplicable ? -1 : 1;
    }

    return first.taxAmount - second.taxAmount;
  });
}

export function App() {
  const [state, setState] = useState<CalculatorState>({
    incomeType: 'dividends',
    grossIncome: '5 000 000 ₽',
    maxKeyRatePercent: '18',
    minimumHoldingPeriodMet: false,
    isBusinessRealEstate: true
  });

  const fieldErrors = useMemo(() => getFieldErrors(state), [state]);
  const hasErrors = hasFieldErrors(fieldErrors);
  const recommendationInput = useMemo(() => buildRecommendationInput(state), [state]);
  const recommendation = useMemo(() => {
    if (hasErrors) {
      return null;
    }

    try {
      return recommendTaxStructure(recommendationInput);
    } catch {
      return null;
    }
  }, [hasErrors, recommendationInput]);

  const sortedResults = useMemo(
    () => sortResults(recommendation?.results ?? [], recommendation?.recommendedEntity ?? null),
    [recommendation]
  );

  const bestResult = sortedResults.find((result) => result.entity === recommendation?.recommendedEntity);
  const personalResult = recommendation?.results.find((result) => result.entity === 'personalIndividual');
  const bestSavings = bestResult ? getSavings(bestResult, personalResult) : null;
  const shouldShowKeyRate = state.incomeType === 'depositInterest';
  const shouldShowRealEstate = state.incomeType === 'realEstateRent' || state.incomeType === 'realEstateSale';
  const shouldShowHoldingPeriod = state.incomeType === 'realEstateSale';
  const allWarnings = [...new Set(sortedResults.flatMap((result) => result.warnings.map(getWarningText)))];

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-content">
          <p className="eyebrow">Налоговая модель РФ · 2026</p>
          <h1 id="hero-title">Калькулятор налоговой структуры</h1>
          <p className="hero-text">
            Введите параметры один раз: калькулятор сравнит все структуры, покажет лучшую и оставит детали расчёта раскрываемыми.
          </p>
          <div className="hero-steps" aria-label="Основной сценарий">
            <span>1. Доход</span>
            <span>2. Условия</span>
            <span>3. Сравнение</span>
          </div>
        </div>

        <aside className="summary-card" aria-label="Краткий вывод">
          <span className="summary-label">Лучший вариант</span>
          <strong>{bestResult?.entityLabel ?? 'Заполните доход'}</strong>
          <p>{recommendation?.reason ?? 'Введите корректные параметры, чтобы увидеть рекомендацию.'}</p>
        </aside>
      </section>

      <div className="workspace-grid">
        <form className="panel form-panel" onSubmit={(event) => event.preventDefault()}>
          <section aria-labelledby="income-group-title">
            <div className="section-heading compact-heading">
              <span>Шаг 1</span>
              <h2 id="income-group-title">Доход</h2>
              <p>Сумму можно вводить с пробелами, запятыми и символом ₽.</p>
            </div>

            <label className="field" htmlFor="gross-income">
              <span>Валовый доход</span>
              <input
                aria-describedby={`gross-income-hint${fieldErrors.grossIncome ? ' gross-income-error' : ''}`}
                aria-invalid={fieldErrors.grossIncome ? 'true' : 'false'}
                id="gross-income"
                inputMode="decimal"
                type="text"
                value={state.grossIncome}
                onChange={(event) => setState((current) => ({ ...current, grossIncome: event.target.value }))}
              />
              <small id="gross-income-hint">Сумма до удержания налогов. Пример: 5 000 000 ₽.</small>
              {fieldErrors.grossIncome && <strong className="field-error" id="gross-income-error">{fieldErrors.grossIncome}</strong>}
            </label>

            <div className="quick-amounts" aria-label="Быстрый выбор суммы">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setState((current) => ({ ...current, grossIncome: formatRub(amount) }))}
                >
                  {formatAmountButton(amount)}
                </button>
              ))}
            </div>

            <fieldset className="choice-group">
              <legend>Тип дохода</legend>
              <div className="choice-grid income-grid">
                {incomeTypeOptions.map(([value, label]) => (
                  <button
                    aria-pressed={state.incomeType === value}
                    className="choice-card"
                    key={value}
                    type="button"
                    onClick={() => setState((current) => ({ ...current, incomeType: value }))}
                  >
                    <strong>{label}</strong>
                    <span>{incomeTypeHints[value]}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </section>

          <fieldset className="form-section">
            <legend>Параметры ставки</legend>
            {shouldShowKeyRate ? (
              <label className="field" htmlFor="max-key-rate">
                <span>Максимальная ключевая ставка за год, %</span>
                <input
                  aria-describedby={`max-key-rate-hint${fieldErrors.maxKeyRatePercent ? ' max-key-rate-error' : ''}`}
                  aria-invalid={fieldErrors.maxKeyRatePercent ? 'true' : 'false'}
                  id="max-key-rate"
                  inputMode="decimal"
                  type="text"
                  value={state.maxKeyRatePercent}
                  onChange={(event) => setState((current) => ({ ...current, maxKeyRatePercent: event.target.value }))}
                />
                <small id="max-key-rate-hint">Если оставить поле пустым, движок покажет предупреждение и посчитает лимит как 0 ₽.</small>
                {fieldErrors.maxKeyRatePercent && <strong className="field-error" id="max-key-rate-error">{fieldErrors.maxKeyRatePercent}</strong>}
              </label>
            ) : (
              <p className="muted-copy">Для выбранного типа дохода дополнительных параметров ставки не требуется.</p>
            )}
          </fieldset>

          {shouldShowRealEstate && (
            <fieldset className="form-section">
              <legend>Условия недвижимости</legend>
              {shouldShowHoldingPeriod && (
                <label className="switch-row" htmlFor="minimum-holding-period">
                  <input
                    checked={state.minimumHoldingPeriodMet}
                    id="minimum-holding-period"
                    type="checkbox"
                    onChange={(event) => setState((current) => ({ ...current, minimumHoldingPeriodMet: event.target.checked }))}
                  />
                  <span>
                    <strong>Минимальный срок владения соблюдён</strong>
                    <small>Если условие выполнено, продажа недвижимости для физлица считается освобождённой от НДФЛ.</small>
                  </span>
                </label>
              )}

              <label className="switch-row" htmlFor="business-real-estate">
                <input
                  checked={state.isBusinessRealEstate}
                  id="business-real-estate"
                  type="checkbox"
                  onChange={(event) => setState((current) => ({ ...current, isBusinessRealEstate: event.target.checked }))}
                />
                <span>
                  <strong>Недвижимость связана с предпринимательской деятельностью</strong>
                  <small>Параметр влияет на применимость логики ИП при продаже недвижимости.</small>
                </span>
              </label>
            </fieldset>
          )}
        </form>

        <section className="result-column" aria-live="polite" aria-labelledby="result-title">
          <article className="panel dashboard-card">
            <div className="result-title-row">
              <div>
                <span className="eyebrow">Главный вывод</span>
                <h2 id="result-title">{bestResult?.entityLabel ?? 'Нужны корректные данные'}</h2>
              </div>
              <span className={bestResult ? 'status-pill success' : 'status-pill neutral'}>{bestResult ? 'Рекомендовано' : 'Нет расчёта'}</span>
            </div>

            {hasErrors || !bestResult ? (
              <div className="error-box" role="alert">
                <h3>Проверьте ввод</h3>
                <p>Исправьте подсвеченные поля формы — после этого рекомендация обновится автоматически.</p>
              </div>
            ) : (
              <>
                <p className="dashboard-reason">{recommendation?.reason}</p>
                <div className="metrics-grid" aria-label="Ключевые метрики рекомендации">
                  <article className="metric-card primary-metric">
                    <span>Налог</span>
                    <strong>{formatRub(bestResult.taxAmount)}</strong>
                  </article>
                  <article className="metric-card">
                    <span>Чистый доход</span>
                    <strong>{formatRub(bestResult.netIncome)}</strong>
                  </article>
                  <article className="metric-card">
                    <span>Эффективная ставка</span>
                    <strong>{percentFormatter.format(bestResult.effectiveRate)}</strong>
                  </article>
                  <article className="metric-card">
                    <span>Экономия к ФЛ</span>
                    <strong>{formatSavings(bestSavings)}</strong>
                  </article>
                </div>
              </>
            )}
          </article>

          {recommendation && bestResult && (
            <section className="panel comparison-panel" aria-labelledby="comparison-title">
              <div className="section-heading compact-heading">
                <span>Центр решения</span>
                <h2 id="comparison-title">Сравнение всех структур</h2>
                <p>Лучшая применимая структура отмечена бейджем и стоит первой. Экономия считается относительно физлица.</p>
              </div>

              <div className="table-wrap">
                <table>
                  <caption>Сравнение налоговой нагрузки по структурам владения</caption>
                  <thead>
                    <tr>
                      <th scope="col">Структура</th>
                      <th scope="col">Применимость</th>
                      <th scope="col">Налоговая база</th>
                      <th scope="col">Налог</th>
                      <th scope="col">Чистый доход</th>
                      <th scope="col">Эфф. ставка</th>
                      <th scope="col">Экономия к ФЛ</th>
                      <th scope="col">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedResults.map((result) => {
                      const isBest = result.entity === recommendation.recommendedEntity;
                      return (
                        <tr className={isBest ? 'best-row' : undefined} key={result.entity}>
                          <th data-label="Структура" scope="row">
                            <span>{result.entityLabel}</span>
                            <small>{entityDescriptions[result.entity]}</small>
                          </th>
                          <td data-label="Применимость">{result.isApplicable ? 'Да' : 'Нет'}</td>
                          <td data-label="Налоговая база">{formatRub(result.taxableBase)}</td>
                          <td data-label="Налог">{formatRub(result.taxAmount)}</td>
                          <td data-label="Чистый доход">{formatRub(result.netIncome)}</td>
                          <td data-label="Эфф. ставка">{percentFormatter.format(result.effectiveRate)}</td>
                          <td data-label="Экономия к ФЛ">{formatSavings(getSavings(result, personalResult))}</td>
                          <td data-label="Статус"><span className={isBest ? 'row-badge best' : 'row-badge'}>{getRowStatus(result, isBest)}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {allWarnings.length > 0 && (
            <section className="panel warning-panel" aria-labelledby="warnings-title">
              <h2 id="warnings-title">Что важно проверить</h2>
              <ul>
                {allWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </section>
          )}

          {recommendation && bestResult && (
            <section className="panel details-panel" aria-labelledby="details-title">
              <div className="section-heading compact-heading">
                <span>Вторичный режим</span>
                <h2 id="details-title">Детализация расчёта</h2>
                <p>Раскройте нужную структуру, чтобы увидеть формулу, статьи НК РФ и допущения.</p>
              </div>

              <div className="details-list">
                {sortedResults.map((result) => {
                  const inputForResult: TaxCalculationInput = { ...recommendationInput, entity: result.entity };
                  return (
                    <details className="detail-card" key={result.entity} open={result.entity === recommendation.recommendedEntity}>
                      <summary>
                        <span>{result.entityLabel}</span>
                        <small>{result.isApplicable ? `Налог ${formatRub(result.taxAmount)}` : 'Не применимо'}</small>
                      </summary>

                      <div className="detail-content">
                        <section aria-label={`Формула для ${result.entityLabel}`}>
                          <h3>Формула</h3>
                          <p>{getFormulaText(result, inputForResult)}</p>
                        </section>
                        <section aria-label={`Ставка для ${result.entityLabel}`}>
                          <h3>Ставка</h3>
                          <p>{getRateText(result)}</p>
                        </section>
                        <section aria-label={`Статьи НК РФ для ${result.entityLabel}`}>
                          <h3>Статьи НК РФ</h3>
                          <ul>
                            {result.appliedArticles.map((article) => (
                              <li key={article}>{article}</li>
                            ))}
                          </ul>
                        </section>
                        <section aria-label={`Допущения для ${result.entityLabel}`}>
                          <h3>Допущения</h3>
                          <ul>
                            {result.assumptions.map((assumption) => (
                              <li key={assumption}>{getAssumptionText(assumption)}</li>
                            ))}
                          </ul>
                        </section>
                        {result.warnings.length > 0 && (
                          <section aria-label={`Предупреждения для ${result.entityLabel}`}>
                            <h3>Что проверить</h3>
                            <ul>
                              {result.warnings.map((warning) => (
                                <li key={warning}>{getWarningText(warning)}</li>
                              ))}
                            </ul>
                          </section>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          )}
        </section>
      </div>

      <section className="disclaimer">
        <strong>Важно:</strong> калькулятор не является налоговой, юридической или инвестиционной консультацией.
        Перед принятием решений проверьте расчёт и применимость налоговых правил с профильным специалистом.
      </section>
    </main>
  );
}
