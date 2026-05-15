# tax-structure-calculator

Vite-приложение для сравнения налоговой нагрузки по нескольким структурам владения активами в РФ на правилах 2026 года.

## Что внутри

- React + Vite интерфейс калькулятора.
- TypeScript tax engine в `src/lib/tax-engine`.
- Сравнение физлица, ИП на УСН 6%, личного фонда и личного фонда с ЗПИФ.
- Production build в папку `dist`, готовый для Vercel.

## Локальный запуск

Требуется Node.js 24.x.

```bash
npm install
npm run dev
```

После запуска откройте адрес, который покажет Vite, обычно `http://localhost:5173`.

## Проверки перед деплоем

```bash
npm run build
npm test
npm run lint
```

## Деплой в Vercel

1. Запушьте репозиторий в GitHub/GitLab/Bitbucket.
2. Откройте Vercel Dashboard.
3. Нажмите **Add New...** → **Project**.
4. Выберите этот репозиторий.
5. Vercel должен определить проект как Vite. Если настройки нужно ввести вручную, используйте:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install --include=dev`
6. В разделе Node.js Version выберите `24.x`, если Vercel не подхватит значение из `package.json`.
7. Нажмите **Deploy**.

Переменные окружения для текущей версии не нужны.

## Почему build-зависимости лежат в `dependencies`

Vercel preview и production могут отличаться настройками установки зависимостей. Если production-сборка запускает `npm install` с production-only режимом или в проекте выставлена переменная `NPM_CONFIG_PRODUCTION=true`, пакеты из `devDependencies` не устанавливаются, и команда `npm run build` падает с кодом 127 (`tsc` или `vite` не найдены).

Поэтому `typescript`, `vite`, `@vitejs/plugin-react` и React type-пакеты указаны в `dependencies`. Это делает production build воспроизводимым даже при установке только production dependencies.

## Если Vercel пишет `tsc: command not found`

Сначала проверьте в build log строку `Cloning ... (Branch: ..., Commit: ...)`. Если там указан старый коммит `ce50e35`, Vercel собирает версию до добавления Vite, `typescript`, `vite` и `vercel.json`; такой деплой всегда падает на `tsc: command not found`.

Актуальная Vite-версия должна содержать:

- `package.json` с `typescript`, `vite` и `@vitejs/plugin-react` в `dependencies`, чтобы production install тоже мог выполнить build;
- `vercel.json` с `installCommand`, `buildCommand` и `outputDirectory`;
- `index.html`, `vite.config.ts`, `src/main.tsx` и `src/ui/App.tsx`.

Что сделать:

1. В GitHub откройте репозиторий → **Code** → branch `main` и убедитесь, что там есть `vercel.json` и `vite.config.ts`.
2. В GitHub проверьте, что последний commit в `main` новее `ce50e35`. Если `main` всё ещё на `ce50e35`, PR с Vite-кодом не попал в `main`.
3. В Vercel откройте проект → **Settings** → **Git** и проверьте **Production Branch**. Она должна совпадать с веткой, куда смержен Vite-код.
4. В Vercel запустите новый redeploy уже после того, как `main` указывает на новый commit.
5. Если в Vercel вручную задан Install Command, поставьте `npm install --include=dev` или очистите поле, чтобы использовался `vercel.json`.

Локально можно проверить head ветки перед деплоем:

```bash
git fetch origin
git rev-parse origin/main
```

Вывод не должен быть `ce50e35...`.

## Важно

Калькулятор не является налоговой, юридической или инвестиционной консультацией. Перед применением результатов проверьте расчёт и применимость налоговых правил с профильным специалистом.
