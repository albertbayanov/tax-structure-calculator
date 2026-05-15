import { TAX_RULES_RU_2026 } from './data/tax-rules-ru-2026.ts';
import { recommendTaxStructure } from './lib/tax-engine/recommendation.ts';
import type { IncomeType, RecommendationInput, TaxCalculationResult } from './lib/tax-engine/types.ts';

const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  depositInterest: 'Проценты по вкладам',
  dividends: 'Дивиденды',
  shareSale: 'Продажа акций',
  bondCoupon: 'Купоны по облигациям',
  bondSaleOrRedemption: 'Продажа / погашение облигаций',
  realEstateRent: 'Аренда недвижимости',
  realEstateSale: 'Продажа недвижимости'
};

const INVESTMENT_INCOME_TYPES: readonly IncomeType[] = [
  'depositInterest',
  'dividends',
  'shareSale',
  'bondCoupon',
  'bondSaleOrRedemption'
] as const;

const REAL_ESTATE_INCOME_TYPES: readonly IncomeType[] = [
  'realEstateRent',
  'realEstateSale'
] as const;

const appElement = document.querySelector<HTMLDivElement>('#app');

if (!appElement) {
  throw new Error('App root element was not found.');
}

const app = appElement;

function formatRub(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function parseNumber(value: FormDataEntryValue | null, fallback: number): number {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }

  const normalized = value.replaceAll(' ', '').replace(',', '.');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: FormDataEntryValue | null): boolean {
  return value === 'true';
}

function buildInput(form: HTMLFormElement): RecommendationInput {
  const formData = new FormData(form);
  const incomeType = String(formData.get('incomeType')) as IncomeType;
  const grossIncome = parseNumber(formData.get('grossIncome'), 1_000_000);
  const maxKeyRatePercent = parseNumber(formData.get('maxKeyRatePercent'), 16);
  const minimumHoldingPeriodMet = parseBoolean(formData.get('minimumHoldingPeriodMet'));
  const isBusinessRealEstate = parseBoolean(formData.get('isBusinessRealEstate'));

  return {
    incomeType,
    grossIncome,
    maxKeyRatePercent,
    minimumHoldingPeriodMet,
    isBusinessRealEstate
  };
}

function resultStatus(result: TaxCalculationResult): string {
  return result.isApplicable ? 'Применимо' : 'Не применимо';
}

function renderResults(results: TaxCalculationResult[]): string {
  return results.map((result) => `
    <article class="result-card ${result.isApplicable ? '' : 'result-card--disabled'}">
      <div class="result-card__header">
        <h3>${result.entityLabel}</h3>
        <span>${resultStatus(result)}</span>
      </div>
      <dl class="metrics">
        <div>
          <dt>Налоговая база</dt>
          <dd>${formatRub(result.taxableBase)}</dd>
        </div>
        <div>
          <dt>Налог</dt>
          <dd>${formatRub(result.taxAmount)}</dd>
        </div>
        <div>
          <dt>Эффективная ставка</dt>
          <dd>${formatPercent(result.effectiveRate)}</dd>
        </div>
        <div>
          <dt>Доход после налога</dt>
          <dd>${formatRub(result.netIncome)}</dd>
        </div>
      </dl>
      <p><strong>Ставка:</strong> ${result.appliedRate}</p>
      <p><strong>Формула:</strong> ${result.formulaText}</p>
      <p><strong>Статьи:</strong> ${result.appliedArticles.join(', ')}</p>
      ${result.warnings.length > 0 ? `<ul class="warnings">${result.warnings.map((warning) => `<li>${warning}</li>`).join('')}</ul>` : ''}
    </article>
  `).join('');
}

function updateConditionalFields(form: HTMLFormElement): void {
  const formData = new FormData(form);
  const incomeType = String(formData.get('incomeType')) as IncomeType;
  const depositField = form.querySelector<HTMLElement>('[data-field="deposit"]');
  const holdingField = form.querySelector<HTMLElement>('[data-field="holding"]');
  const businessField = form.querySelector<HTMLElement>('[data-field="business"]');

  if (depositField) {
    depositField.hidden = incomeType !== 'depositInterest';
  }

  if (holdingField) {
    holdingField.hidden = incomeType !== 'realEstateSale';
  }

  if (businessField) {
    businessField.hidden = incomeType !== 'realEstateSale';
  }
}

function renderCalculation(form: HTMLFormElement): void {
  const input = buildInput(form);
  const recommendation = recommendTaxStructure(input);
  const resultsElement = app.querySelector<HTMLElement>('[data-results]');
  const recommendationElement = app.querySelector<HTMLElement>('[data-recommendation]');
  const scopeElement = app.querySelector<HTMLElement>('[data-scope]');

  if (!resultsElement || !recommendationElement || !scopeElement) {
    return;
  }

  const incomeGroup = INVESTMENT_INCOME_TYPES.includes(input.incomeType)
    ? 'инвестиционный доход'
    : REAL_ESTATE_INCOME_TYPES.includes(input.incomeType)
      ? 'недвижимость'
      : 'доход';

  recommendationElement.innerHTML = recommendation.recommendedEntity === null
    ? `<h2>Рекомендация</h2><p>${recommendation.reason}</p>`
    : `
      <h2>Рекомендация</h2>
      <p><strong>${recommendation.recommendedEntityLabel}</strong> — минимальный налог среди применимых структур.</p>
      <p>${recommendation.reason}</p>
    `;

  scopeElement.textContent = `Расчёт: ${INCOME_TYPE_LABELS[input.incomeType]}, ${incomeGroup}, ${formatRub(input.grossIncome)}.`;
  resultsElement.innerHTML = renderResults(recommendation.results);
}

function renderApp(): void {
  const incomeOptions = Object.entries(INCOME_TYPE_LABELS).map(([value, label]) => `
    <option value="${value}">${label}</option>
  `).join('');

  app.innerHTML = `
    <header class="hero">
      <div>
        <p class="eyebrow">Россия · 2026 · налоговые резиденты РФ</p>
        <h1>Калькулятор сравнения налоговых структур</h1>
        <p>
          Сравните ФЛ, ИП на УСН 6%, личный фонд и личный фонд + ЗПИФ для российских доходов,
          ценных бумаг и недвижимости.
        </p>
      </div>
      <div class="hero__badge">
        <span>${TAX_RULES_RU_2026.year}</span>
        <small>правила расчёта</small>
      </div>
    </header>

    <main class="layout">
      <section class="panel">
        <h2>Параметры расчёта</h2>
        <form id="calculator-form" class="form">
          <label>
            Тип дохода
            <select name="incomeType">${incomeOptions}</select>
          </label>

          <label>
            Валовый доход, ₽
            <input name="grossIncome" type="number" min="0" step="1000" value="3000000" />
          </label>

          <label data-field="deposit">
            Максимальная ключевая ставка за год, %
            <input name="maxKeyRatePercent" type="number" min="0" step="0.1" value="16" />
          </label>

          <label data-field="holding">
            Минимальный срок владения недвижимостью соблюдён?
            <select name="minimumHoldingPeriodMet">
              <option value="false">Нет</option>
              <option value="true">Да</option>
            </select>
          </label>

          <label data-field="business">
            Недвижимость использовалась в бизнесе ИП?
            <select name="isBusinessRealEstate">
              <option value="true">Да</option>
              <option value="false">Нет</option>
            </select>
          </label>
        </form>

        <div class="scope-note" data-scope></div>
      </section>

      <section class="panel recommendation" data-recommendation></section>
    </main>

    <section class="results" data-results></section>

    <footer class="footer">
      <p>
        Допущения: только российские налоговые резиденты, российские активы, российские ценные бумаги и недвижимость.
        Не учитываются комиссии брокера, убытки прошлых лет, ЛДВ, НКД, кадастровая стоимость, расходы на приобретение
        недвижимости и вычет 1 млн ₽.
      </p>
    </footer>
  `;

  const form = app.querySelector<HTMLFormElement>('#calculator-form');

  if (!form) {
    return;
  }

  updateConditionalFields(form);
  renderCalculation(form);

  form.addEventListener('input', () => {
    updateConditionalFields(form);
    renderCalculation(form);
  });

  form.addEventListener('change', () => {
    updateConditionalFields(form);
    renderCalculation(form);
  });
}

renderApp();
