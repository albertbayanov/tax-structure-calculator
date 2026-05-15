# AGENTS.md

## Project overview

This is a Russian tax structure calculator for comparing tax outcomes across asset ownership structures under the 2026 Russian tax model.

The product goal is to help a user understand which structure is more tax-efficient and why.

The calculator compares:

- ФЛ
- ИП на УСН 6%
- Личный фонд
- Личный фонд + ЗПИФ

Supported income types:

- Проценты по вкладам
- Дивиденды
- Продажа акций
- Купоны облигаций
- Продажа или погашение облигаций
- Аренда недвижимости
- Продажа недвижимости

The app is a financial decision-support interface. Prioritize clarity, trust, and logical flow over visual decoration.

## Tech stack

- React
- TypeScript
- Vite
- No unnecessary UI libraries
- No backend in the current version

Important files:

- UI: `src/ui/App.tsx`
- Styles: `src/ui/styles.css`
- Tax rules: `src/data/tax-rules-ru-2026.ts`
- Tax engine: `src/lib/tax-engine`
- Tests: `src/lib/tax-engine/__tests__`

## Setup commands

Install dependencies:

```bash
npm install
```

Run local dev server:

```bash
npm run dev
```

Run production build:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Run lint:

```bash
npm run lint
```

Before finishing any coding task, run:

```bash
npm run build
npm test
npm run lint
```

Fix all failures before final response.

## Product logic

The main user flow must be:

1. User chooses income type.
2. User enters gross income.
3. User enters only the extra parameters relevant to that income type.
4. App compares all available structures.
5. App shows the best applicable structure.
6. App explains why this structure is recommended.
7. App shows a comparison table.
8. App lets the user open calculation details.

The user should understand the recommended structure within 10-15 seconds.

The selected single structure view is secondary. The main value of the app is comparing all structures.

## UX rules

The interface must be logical, calm, and business-like.

Prioritize:

- one clear primary result;
- comparison of all structures;
- visible tax amount;
- visible net income;
- visible effective tax rate;
- visible savings versus ФЛ;
- clear warnings and assumptions;
- progressive disclosure for formulas and legal references.

Avoid:

- making the user choose one structure before seeing the comparison;
- showing formulas as the main content;
- showing English text in the UI;
- showing irrelevant fields;
- overwhelming the first screen with legal details.

## Form behavior

Show fields conditionally:

- Show “Максимальная ключевая ставка за год” only for `depositInterest`.
- Show “Минимальный срок владения недвижимостью соблюдён” only for `realEstateSale`.
- Show “Недвижимость используется в предпринимательской деятельности” only for real estate income types where it affects the calculation.

Gross income input must support:

- `5000000`
- `5 000 000`
- `5 000 000 ₽`
- `5,000,000`
- `5000000.50`
- `5000000,50`

Internally convert the value to a valid number before passing it to the tax engine.

Add quick amount buttons:

- 1 млн
- 5 млн
- 10 млн
- 50 млн
- 100 млн

## Result behavior

The top result block must show:

- recommended structure;
- tax amount;
- net income;
- effective tax rate;
- savings versus ФЛ;
- short explanation in Russian.

Comparison table must show:

- structure;
- applicability;
- taxable base;
- tax amount;
- net income;
- effective tax rate;
- savings versus ФЛ;
- status or key warning.

Highlight the best applicable structure with text, icon, badge, or label. Color alone is not enough.

For non-applicable structures, show a clear reason.

## Details behavior

Move technical details into expandable sections:

- formula;
- applied rate;
- tax articles;
- assumptions;
- warnings.

Do not make formulas the first thing users see.

Legal articles are useful, but they are secondary detail.

## Language and copywriting

All user-facing text must be in Russian.

Translate all current English user-facing strings, including:

- recommendation reasons;
- assumptions;
- warnings;
- error messages;
- formula descriptions where visible.

Use direct, professional Russian.

Good examples:

- “Личный фонд даёт минимальный налог среди применимых структур.”
- “Экономия относительно ФЛ: 240 000 ₽.”
- “Проверьте применимость режима с налоговым консультантом.”

Avoid vague text:

- “No selected entity is applicable”
- “Taxpayer is a Russian tax resident”
- “grossIncome must be finite”

## Validation and errors

Errors must be shown next to the relevant field.

Error messages must:

- be in Russian;
- explain the issue;
- explain how to fix it.

Examples:

- “Введите сумму дохода больше или равную 0.”
- “Введите ключевую ставку в процентах, например 18.”
- “Сумма не распознана. Используйте формат 5 000 000.”

Use:

- `aria-invalid`
- `aria-describedby`
- visible error text

Keep the user's original input visible after validation errors.

## Accessibility

Use semantic HTML:

- `main`
- `section`
- `fieldset`
- `legend`
- `label`
- `table`
- `caption`
- `th scope="col"`
- `th scope="row"`

Dynamic calculation results should use:

```tsx
aria-live="polite"
```

Inputs and selects must have labels.

Hints and error messages must be connected with `aria-describedby`.

The app must be usable by keyboard.

Color must not be the only indicator of:

- best result;
- error;
- warning;
- non-applicable structure.

## Tax engine rules

Be careful with tax logic.

Do not silently change formulas in:

- `src/lib/tax-engine`

When changing tax logic:

- explain the change;
- add or update tests;
- keep calculations deterministic;
- preserve rounding behavior unless the task explicitly requires changing it.

UI refactoring must not change tax results.

## Testing rules

Add or update tests for:

- parsing money input;
- recommendation selection;
- conditional field logic if extracted into helpers;
- edge cases.

Required edge cases:

- empty income;
- income 0;
- negative income;
- amount with spaces;
- amount with ₽;
- deposit interest without key rate;
- real estate sale with minimum holding period met;
- all structures non-applicable.

## Code style

- Use TypeScript.
- Do not use `any`.
- Prefer small pure helper functions.
- Keep formatting helpers separate from calculation helpers.
- Keep UI state understandable.
- Avoid large nested JSX blocks when a small component improves readability.
- Keep components in `src/ui` unless there is a clear reason to move them.

## Suggested component structure

Preferred UI components:

- `App`
- `CalculatorForm`
- `RecommendationCard`
- `MetricsGrid`
- `ComparisonTable`
- `StructureDetails`
- `Disclosure`
- `FieldError`
- `AmountQuickButtons`

Preferred helpers:

- `parseMoneyInput`
- `formatRub`
- `formatPercent`
- `getRelevantFieldsForIncomeType`
- `calculateSavingsVsPersonalIndividual`
- `getApplicabilityStatus`

## Visual design principles

The calculator should look like a serious financial dashboard.

Use:

- clean cards;
- strong hierarchy;
- readable spacing;
- compact but clear tables;
- mobile-first responsive behavior;
- calm colors;
- visible labels and statuses.

Avoid:

- decorative effects that reduce readability;
- excessive shadows;
- huge headings that push useful results below the fold;
- dense legal text on the first screen.

## Mobile behavior

On small screens:

- form fields stack vertically;
- primary recommendation appears before the comparison;
- comparison table can become cards or horizontal scroll;
- key metrics remain readable;
- touch targets are at least 44px high.

## Deployment

The app is deployed to Vercel.

Keep:

- `npm run build`
- output directory `dist`
- Node.js version from `package.json`

Do not add environment variables unless the task explicitly requires them.

## Final response requirements for coding agents

When finishing a task, report:

- what changed;
- which files changed;
- which checks were run;
- any remaining risks or assumptions.

If checks fail, explain the failure and the likely fix.
