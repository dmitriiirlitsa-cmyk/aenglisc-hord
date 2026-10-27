// Функция Netlify: тот же POST /api/chat, что и у локального сервера Express
import { handleChat } from '../../server/chat.js';

export default async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Используйте POST' }, { status: 405 });
  }
  let messages;
  try {
    ({ messages } = await req.json());
  } catch {
    return Response.json({ error: 'Некорректный JSON' }, { status: 400 });
  }
  // Запас до лимита Netlify в 60 секунд: после 45 секунд новые попытки не начинаются
  const { status, body } = await handleChat(messages, { deadlineMs: 45_000 });
  return Response.json(body, { status });
};

export const config = { path: '/api/chat' };
