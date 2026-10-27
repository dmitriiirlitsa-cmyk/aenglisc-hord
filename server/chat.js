// Общая логика общения с Gemini: её используют и локальный сервер Express (server/index.js),
// и функция Netlify (netlify/functions/chat.mjs)
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from './prompt.js';

const MAX_HISTORY = 30; // последних сообщений, отправляемых в модель
const MAX_MESSAGE_LENGTH = 4000;
export const MAX_USER_INPUT = 50; // длина нового вопроса ученика; совпадает с MAX_INPUT в src/lib/limits.js

// Переменные окружения читаются при вызове, а не при импорте: локально .env загружается позже
export const models = () => [
  process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
  process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-latest',
];

let client;
const ai = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

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
const isOverloaded = (err) => err?.status === 503 || err?.status === 429;

// Каждая модель получает вторую попытку, если Gemini временно перегружен.
// deadlineMs не даёт повторам выйти за лимит времени хостинга (у Netlify — 60 секунд)
async function generate(contents, deadlineMs) {
  const start = Date.now();
  let lastError;
  for (const model of models()) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (lastError && Date.now() - start > deadlineMs) throw lastError;
      try {
        const response = await ai().models.generateContent({
          model,
          contents,
          config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.4 },
        });
        const text = response.text;
        if (!text) throw new Error('Пустой ответ модели');
        return { text, model };
      } catch (err) {
        lastError = err;
        console.warn(`Модель ${model} (попытка ${attempt}) недоступна: ${err.message}`);
        if (!isOverloaded(err)) break;
        if (attempt === 1) await sleep(2000);
      }
    }
  }
  throw lastError;
}

// Проверяет запрос и возвращает { status, body } — без привязки к Express или Netlify
export async function handleChat(messages, { deadlineMs = Infinity } = {}) {
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
  if (!process.env.GEMINI_API_KEY) {
    return { status: 500, body: { error: 'На сервере не задан GEMINI_API_KEY.' } };
  }
  try {
    const { text, model } = await generate(contents, deadlineMs);
    return { status: 200, body: { text, model } };
  } catch (err) {
    console.error(err);
    const error = isOverloaded(err)
      ? 'Gemini сейчас перегружен. Подождите минуту и нажмите ↻ под своим сообщением.'
      : 'Не удалось получить ответ от Gemini. Проверьте ключ API и название модели.';
    return { status: 502, body: { error } };
  }
}
