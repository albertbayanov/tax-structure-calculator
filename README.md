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
   - Install Command: `npm install`
6. В разделе Node.js Version выберите `24.x`, если Vercel не подхватит значение из `package.json`.
7. Нажмите **Deploy**.

Переменные окружения для текущей версии не нужны.

## Важно

Калькулятор не является налоговой, юридической или инвестиционной консультацией. Перед применением результатов проверьте расчёт и применимость налоговых правил с профильным специалистом.
