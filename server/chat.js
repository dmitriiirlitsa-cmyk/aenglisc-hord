// Общая логика общения с Gemini: её используют локальный сервер Express (server/index.js),
// функция Netlify (netlify/functions/chat.mjs) и Cloudflare Worker (worker/index.js).
// Gemini вызывается обычным HTTP-запросом без SDK — так код одинаково работает на всех платформах
// и укладывается в лимит процессорного времени Cloudflare.
import { SYSTEM_PROMPT } from './prompt.js';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const MAX_HISTORY = 30; // последних сообщений, отправляемых в модель
const MAX_MESSAGE_LENGTH = 4000;
export const MAX_USER_INPUT = 50; // длина нового вопроса ученика; совпадает с MAX_INPUT в src/lib/limits.js

// Цепочка моделей: при перегрузке или недоступности сервер сразу переходит к следующей.
// Порядок — от лучшего соотношения качества и скорости к запасным (медленные lite — в конце).
const DEFAULT_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
];

// Настройки читаются из env при вызове: на Node это process.env (локально .env загружается позже),
// в Cloudflare Worker — объект env с переменными и секретами проекта.
// GEMINI_MODELS="модель1,модель2,…" заменяет всю цепочку; GEMINI_MODEL / GEMINI_FALLBACK_MODEL ставятся в начало.
export const models = (env = process.env) => {
  const custom = (env.GEMINI_MODELS || '').split(',').map((m) => m.trim()).filter(Boolean);
  const list = [env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL, ...(custom.length ? custom : DEFAULT_MODELS)];
  return [...new Set(list.filter(Boolean))];
};

// Один запрос к модели. Ошибка получает status (503, 429, 404…), как раньше у SDK
async function callModel(model, contents, apiKey) {
  const res = await fetch(`${GEMINI_URL}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { temperature: 0.4 },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  if (!text) throw new Error('Пустой ответ модели');
  return text;
}

// Приводит историю из клиента к формату Gemini multi-turn contents.
// Вопросы, оставшиеся без ответа (запрос завершился ошибкой), выбрасываются:
// иначе модель видит два вопроса подряд и отвечает на оба в одной карточке.
function toContents(messages) {
  const valid = messages.filter((m) => m && typeof m.text === 'string' && m.text.trim());
  return valid
    .filter((m, i) => !(m.role === 'user' && valid[i + 1]?.role === 'user'))
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text.slice(0, MAX_MESSAGE_LENGTH) }],
    }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isOverloaded = (err) => err?.status === 503; // модель временно перегружена
const isQuota = (err) => err?.status === 429; // исчерпан лимит бесплатного тарифа для этой модели

// Первый проход: каждая модель цепочки по одному разу, при любой ошибке — сразу следующая.
// Второй проход (после паузы): ещё раз только те модели, которые были просто перегружены.
// deadlineMs не даёт попыткам выйти за лимит времени хостинга (у Netlify — 60 секунд)
async function generate(contents, deadlineMs, env) {
  const start = Date.now();
  const errors = [];
  let queue = models(env);
  for (let pass = 1; pass <= 2 && queue.length; pass++) {
    if (pass === 2) await sleep(1500);
    const overloaded = [];
    for (const model of queue) {
      if (errors.length && Date.now() - start > deadlineMs) break;
      try {
        const text = await callModel(model, contents, env.GEMINI_API_KEY);
        return { text, model };
      } catch (err) {
        errors.push(err);
        console.warn(`Модель ${model} (проход ${pass}) не ответила: ${err.status || ''} ${String(err.message).slice(0, 120)}`);
        if (isOverloaded(err)) overloaded.push(model);
      }
    }
    queue = overloaded;
  }
  const error = new Error('Ни одна модель не ответила');
  error.reasons = errors;
  throw error;
}

// Проверяет запрос и возвращает { status, body } — без привязки к Express, Netlify или Cloudflare.
// env — откуда брать ключ и модели: по умолчанию process.env, в Cloudflare Worker передаётся env воркера
export async function handleChat(messages, { deadlineMs = Infinity, env = process.env } = {}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { status: 400, body: { error: 'Ожидается непустой массив messages' } };
  }
  if (String(messages.at(-1)?.text || '').length > MAX_USER_INPUT) {
    return { status: 400, body: { error: `Сообщение слишком длинное (максимум ${MAX_USER_INPUT} символов)` } };
  }
  const contents = toContents(messages);
  if (contents.length === 0 || contents.at(-1).role !== 'user') {
    return { status: 400, body: { error: 'Последнее сообщение должно быть от пользователя' } };
  }
  if (!env.GEMINI_API_KEY) {
    return { status: 500, body: { error: 'На сервере не задан GEMINI_API_KEY.' } };
  }
  try {
    const { text, model } = await generate(contents, deadlineMs, env);
    return { status: 200, body: { text, model } };
  } catch (err) {
    console.error(err.message);
    const reasons = err.reasons || [err];
    let error = 'Не удалось получить ответ от Gemini. Проверьте ключ API и названия моделей.';
    if (reasons.some(isOverloaded)) {
      error = 'Gemini сейчас перегружен. Подождите минуту и нажмите ↻ под своим сообщением.';
    } else if (reasons.length && reasons.every(isQuota)) {
      error = 'Дневной лимит бесплатного тарифа Gemini исчерпан. Попробуйте позже.';
    }
    return { status: 502, body: { error } };
  }
}
