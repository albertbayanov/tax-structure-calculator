import { useMemo, useState } from 'react';
import { TAX_RULES_RU_2026 } from '../data/tax-rules-ru-2026.ts';
import { calculateTax } from '../lib/tax-engine/calculate.ts';
import { recommendTaxStructure } from '../lib/tax-engine/recommendation.ts';
import type { IncomeType, TaxCalculationInput, TaxEntity } from '../lib/tax-engine/types.ts';

const incomeTypeLabels: Record<IncomeType, string> = {
  depositInterest: 'Проценты по вкладам',
  dividends: 'Дивиденды',
  shareSale: 'Продажа акций',
  bondCoupon: 'Купоны облигаций',
  bondSaleOrRedemption: 'Продажа или погашение облигаций',
  realEstateRent: 'Аренда недвижимости',
  realEstateSale: 'Продажа недвижимости'
};

const entityOptions = Object.entries(TAX_RULES_RU_2026.entities) as Array<[TaxEntity, string]>;
const incomeTypeOptions = Object.entries(incomeTypeLabels) as Array<[IncomeType, string]>;

const rubFormatter = new Intl.NumberFormat('ru-RU', {
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
  return rubFormatter.format(amount);
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
    try {
      if (!Number.isFinite(input.grossIncome)) {
        return { error: 'Введите корректную сумму дохода.' } as const;
      }

      if (!Number.isFinite(input.maxKeyRatePercent ?? 0)) {
        return { error: 'Введите корректную максимальную ключевую ставку.' } as const;
      }

      return { result: calculateTax(input) } as const;
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Не удалось выполнить расчёт.' } as const;
    }
  }, [input]);

  const recommendation = useMemo(() => {
    try {
      if (!Number.isFinite(input.grossIncome) || !Number.isFinite(input.maxKeyRatePercent ?? 0)) {
        return null;
      }

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
  }, [incomeType, input.grossIncome, input.maxKeyRatePercent, isBusinessRealEstate, minimumHoldingPeriodMet]);

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Налоговая модель РФ · 2026</p>
          <h1>Калькулятор налоговой структуры</h1>
          <p className="hero-text">
            Сравните налоговую нагрузку для физлица, ИП на УСН, личного фонда и личного фонда с ЗПИФ.
          </p>
        </div>
        <div className="hero-card">
          <span>Рекомендация</span>
          <strong>{recommendation?.recommendedEntityLabel ?? 'Нет применимой структуры'}</strong>
          <p>{recommendation?.reason ?? 'Заполните параметры, чтобы получить рекомендацию.'}</p>
        </div>
      </section>

      <section className="layout-grid">
        <form className="panel form-panel">
          <h2>Параметры расчёта</h2>

          <label>
            Структура
            <select value={entity} onChange={(event) => setEntity(event.target.value as TaxEntity)}>
              {entityOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label>
            Тип дохода
            <select value={incomeType} onChange={(event) => setIncomeType(event.target.value as IncomeType)}>
              {incomeTypeOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label>
            Валовый доход, ₽
            <input
              inputMode="decimal"
              min="0"
              type="number"
              value={grossIncome}
              onChange={(event) => setGrossIncome(event.target.value)}
            />
          </label>

          <label>
            Максимальная ключевая ставка за год, %
            <input
              inputMode="decimal"
              min="0"
              step="0.01"
              type="number"
              value={maxKeyRatePercent}
              onChange={(event) => setMaxKeyRatePercent(event.target.value)}
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={minimumHoldingPeriodMet}
              onChange={(event) => setMinimumHoldingPeriodMet(event.target.checked)}
            />
            Минимальный срок владения недвижимостью соблюдён
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isBusinessRealEstate}
              onChange={(event) => setIsBusinessRealEstate(event.target.checked)}
            />
            Недвижимость используется в предпринимательской деятельности
          </label>
        </form>

        <section className="panel result-panel">
          <h2>Результат</h2>
          {'error' in calculation ? (
            <div className="error-box">{calculation.error}</div>
          ) : (
            <>
              <div className="result-header">
                <span>{calculation.result.entityLabel}</span>
                <strong>{calculation.result.isApplicable ? 'Применимо' : 'Не применимо'}</strong>
              </div>

              <div className="metrics-grid">
                <article>
                  <span>Налоговая база</span>
                  <strong>{formatRub(calculation.result.taxableBase)}</strong>
                </article>
                <article>
                  <span>Налог</span>
                  <strong>{formatRub(calculation.result.taxAmount)}</strong>
                </article>
                <article>
                  <span>Чистый доход</span>
                  <strong>{formatRub(calculation.result.netIncome)}</strong>
                </article>
                <article>
                  <span>Эффективная ставка</span>
                  <strong>{percentFormatter.format(calculation.result.effectiveRate)}</strong>
                </article>
              </div>

              <div className="details-block">
                <h3>Формула</h3>
                <p>{calculation.result.formulaText}</p>
              </div>

              <div className="details-block">
                <h3>Ставка и статьи</h3>
                <p>{calculation.result.appliedRate}</p>
                <ul>
                  {calculation.result.appliedArticles.map((article) => (
                    <li key={article}>{article}</li>
                  ))}
                </ul>
              </div>

              {calculation.result.warnings.length > 0 && (
                <div className="warning-box">
                  <h3>Предупреждения</h3>
                  <ul>
                    {calculation.result.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </section>

      {recommendation && (
        <section className="panel comparison-panel">
          <h2>Сравнение структур</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Структура</th>
                  <th>Применимо</th>
                  <th>Налог</th>
                  <th>Чистый доход</th>
                  <th>Эфф. ставка</th>
                </tr>
              </thead>
              <tbody>
                {recommendation.results.map((result) => (
                  <tr key={result.entity} className={result.entity === recommendation.recommendedEntity ? 'best-row' : undefined}>
                    <td>{result.entityLabel}</td>
                    <td>{result.isApplicable ? 'Да' : 'Нет'}</td>
                    <td>{formatRub(result.taxAmount)}</td>
                    <td>{formatRub(result.netIncome)}</td>
                    <td>{percentFormatter.format(result.effectiveRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="disclaimer">
        <strong>Важно:</strong> калькулятор не является налоговой, юридической или инвестиционной консультацией.
        Перед принятием решений проверьте применимость правил с профильным специалистом.
      </section>
    </main>
  );
}
