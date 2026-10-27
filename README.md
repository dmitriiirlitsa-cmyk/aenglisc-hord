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

Если основная модель недоступна (неверное имя, квота, ошибка), сервер автоматически пробует fallback. Названия моделей можно переопределить через `GEMINI_MODEL` и `GEMINI_FALLBACK_MODEL` в `.env`.

## Структура

```
server/chat.js        общая логика Gemini: история, fallback моделей, повторы, проверки
server/index.js       локальный сервер Express (+ лимит запросов по IP)
server/prompt.js      системный промпт преподавателя
netlify/functions/    функция /api/chat для Netlify
src/App.jsx           вкладки «Чат» / «Мой словарь», localStorage
src/components/       Chat, EntryCard (карточка статьи), Dictionary, SpeakButton
src/lib/              разбор метаданных, озвучка (speechSynthesis en-US), хранилище
```

Модель в конце каждой словарной статьи добавляет служебный блок `lexi-meta` (слово, транскрипция, CEFR, перевод). Фронтенд вырезает его и использует для шапки карточки и сохранения в «Мой словарь».
