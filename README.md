# Good Pass

Небольшой образовательный сервис, который объясняет стойкость пароля, оценивает
время перебора и подсказывает, как сделать пароль сильнее.

## Запуск

```bash
npm install
npm run start
```

Сервис поднимется на `http://localhost:3000` и будет обслуживать статическую страницу
из каталога `public/`.

## Прод: Cloudflare Pages

Продакшен — Cloudflare Pages (проект `good-pass`, https://good-pass.pages.dev),
деплоится из `main`. Pages отдаёт `public/` с заголовками из `public/_headers`,
а API — функции из `functions/api/v1/`. Express (`src/server.js`) там не работает:
он нужен для локальной разработки и тестов. Логика API одна на оба варианта —
`src/api.js`.

Проверить локально так, как на проде (функции и `_headers`):

```bash
npx wrangler@4 pages dev public
```

CSP в `public/_headers` и в `src/server.js` должна совпадать — это проверяет тест.

## Проверка

```bash
npm test
```

Тесты используют встроенный `node:test` и покрывают основные сценарии анализа стойкости.
