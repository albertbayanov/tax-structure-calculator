# tax-structure-calculator

Веб-калькулятор сравнения российских налоговых структур для налоговых резидентов РФ.

## Что считает

Калькулятор сравнивает:

- ФЛ;
- ИП на УСН 6% для аренды и продажи недвижимости;
- личный фонд;
- личный фонд + ЗПИФ.

Поддерживаемые типы доходов:

- проценты по вкладам;
- дивиденды;
- продажа акций;
- купоны по облигациям;
- продажа или погашение облигаций;
- аренда недвижимости;
- продажа недвижимости.

## Локальный запуск

```bash
npm install
npm run dev
```

После запуска Vite откроет приложение локально, обычно по адресу:

```text
http://localhost:5173
```

## Проверки

```bash
npm run build
npm test
npm run lint
```

## Развертывание на Vercel

При создании проекта в Vercel выберите:

| Поле | Значение |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | `./` |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Файл `vercel.json` уже фиксирует build command, output directory и Vite framework preset.

## Что нужно от владельца проекта для полной публикации

1. GitHub-репозиторий с этим кодом.
2. Аккаунт Vercel, подключённый к GitHub.
3. Импорт репозитория в Vercel с preset `Vite`.
4. Если нужна красивая ссылка на своём домене — доступ к DNS домена, чтобы добавить записи Vercel.

Если кастомный домен не нужен, Vercel сам выдаст ссылку вида:

```text
https://tax-structure-calculator.vercel.app
```
