# ÆNGLISC HORD

Персональный преподаватель американского английского и словарь на Gemini API. Название — «английская сокровищница» на древнеанглийском.

Тема оформления: светлая, тёмная или как в системе (переключатель в шапке, выбор запоминается).

- **Бэкенд:** Node.js + Express, `@google/genai`, модель `gemini-3.1-flash-lite` с fallback на `gemini-flash-latest`
- **Фронтенд:** React + Tailwind CSS (Vite)

## Запуск

1. Установите [Node.js 20+](https://nodejs.org).
2. Установите зависимости:
   ```bash
   npm install
   ```
3. Скопируйте `.env.example` в `.env` и вставьте ключ из https://aistudio.google.com/apikey
4. Режим разработки (API на :3001, фронтенд на :5173):
   ```bash
   npm run dev
   ```
   Откройте http://localhost:5173

Продакшен: `npm run build`, затем `npm start` — Express отдаёт собранный фронтенд на http://localhost:3001.

## Админка «Грамматики» (Decap CMS)

Темы раздела «Грамматика» — Markdown-файлы в `content/grammar/`. Их удобно писать через админку: https://aenglisc-hord.netlify.app/admin/

- Вход через GitHub. Нужна разовая настройка: OAuth-приложение на GitHub (callback `https://api.netlify.com/auth/done`) и провайдер GitHub в Netlify → Access & security → OAuth.
- «Опубликовать» сохраняет тему в репозиторий. Сайт читает темы прямо с GitHub (`src/lib/grammar.js`), поэтому новая тема видна примерно через минуту **без пересборки**: правило `ignore` в `netlify.toml` отменяет сборку, если в коммите изменились только `content/` и `public/uploads/`. Это экономит кредиты Netlify (одна сборка — 15 кредитов из 300 в месяц на бесплатном тарифе).
- Картинки из админки (`public/uploads/`) на страницах тем тоже берутся с GitHub.
- Поля темы: название, уровень, порядок в списке, краткое описание, черновик (не показывается на сайте), текст.
- Настройки админки: `public/admin/config.yml`.
- Локально, без GitHub: `npm run cms` и `npm start` (после `npm run build`), затем http://localhost:3001/admin/

## Публикация (Cloudflare Workers)

Сайт раздаётся как статика из `dist`, а `/api/*` обрабатывает воркер `worker/index.js` (настройки — `wrangler.jsonc`).

1. https://dash.cloudflare.com → **Workers & Pages → Create application** → подключить репозиторий GitHub.
2. Build command `npm run build`, Deploy command `npx wrangler deploy`.
3. После первой публикации: **Settings → Variables and Secrets** → секреты `GEMINI_API_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.
4. В OAuth-приложении GitHub добавить Redirect URI `https://<адрес воркера>/api/callback`.
5. Необязательно: **Settings → Build → Build watch paths** — исключить `content/**` и `public/uploads/**`.

Локально в режиме Cloudflare: секреты в `.dev.vars` (как `.env`, не загружается на GitHub), затем `npm run build` и `npx wrangler dev`.

## Публикация (Netlify)

1. Загрузите проект на GitHub (без `.env`, `node_modules`, `dist`).
2. На https://app.netlify.com: **Add new site → Import an existing project → GitHub** → выберите репозиторий. Сборка настроена в `netlify.toml`.
3. **Site configuration → Environment variables** → добавьте `GEMINI_API_KEY`, затем **Deploys → Trigger deploy**.

На Netlify запросы `/api/chat` обрабатывает функция `netlify/functions/chat.mjs` (лимит выполнения — 60 секунд). Лимит запросов по IP там не действует: функции не хранят память между вызовами; остаётся ограничение длины сообщения.

## Публикация (Render)

1. Загрузите проект на GitHub (без `.env`, `node_modules`, `dist`).
2. На https://render.com: **New → Blueprint** → выберите репозиторий. Настройки возьмутся из `render.yaml`.
3. Введите значение `GEMINI_API_KEY`, когда Render попросит.

Защита квоты: не больше `RATE_PER_MINUTE` (10) и `RATE_PER_DAY` (150) запросов с одного IP, сообщение не длиннее 50 символов (в интерфейсе — счётчик у поля ввода). Лимиты меняются переменными окружения.

## API

`POST /api/chat`

```json
{ "messages": [ { "role": "user", "text": "abandon" }, { "role": "assistant", "text": "..." }, { "role": "user", "text": "More examples" } ] }
```

Ответ: `{ "text": "...", "model": "gemini-3.1-flash-lite" }`. История (до 30 последних сообщений) передаётся в Gemini как multi-turn `contents`, поэтому уточнения вроде «Compare with abandon» понимаются в контексте.

Модели перебираются по цепочке (`server/chat.js`): `gemini-3.1-flash-lite` → `gemini-3.5-flash` → `gemini-3-flash-preview` → `gemini-flash-latest` → `gemini-3.5-flash-lite` → `gemini-flash-lite-latest`. При перегрузке (503), лимите (429) или недоступности модели сервер сразу берёт следующую; перегруженные пробуются второй раз после паузы. Всю цепочку можно заменить переменной `GEMINI_MODELS="модель1,модель2"`, а `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL` ставят модели в её начало.

## Структура

```
server/chat.js        общая логика Gemini: история, fallback моделей, повторы, проверки
server/index.js       локальный сервер Express (+ лимит запросов по IP)
server/prompt.js      системный промпт преподавателя
netlify/functions/    функция /api/chat для Netlify
worker/               Cloudflare Worker: /api/chat, вход в админку через GitHub
wrangler.jsonc        настройки Cloudflare Workers
public/admin/         админка Decap CMS и её настройки
content/grammar/      темы «Грамматики» (пишутся через админку)
src/App.jsx           вкладки «Чат» / «Мой словарь», localStorage
src/components/       Chat, EntryCard (карточка статьи), Dictionary, SpeakButton
src/lib/              разбор метаданных, озвучка (speechSynthesis en-US), хранилище
```

Модель в конце каждой словарной статьи добавляет служебный блок `lexi-meta` (слово, транскрипция, CEFR, перевод). Фронтенд вырезает его и использует для шапки карточки и сохранения в «Мой словарь».
