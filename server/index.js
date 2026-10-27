import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { handleChat, models } from './chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env ищется рядом с проектом, а не в текущей папке — сервер можно запускать откуда угодно
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const PORT = process.env.PORT || 3001;
const RATE_PER_MINUTE = Number(process.env.RATE_PER_MINUTE) || 10;
const RATE_PER_DAY = Number(process.env.RATE_PER_DAY) || 150;

if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY не задан. Создайте файл .env по образцу .env.example');
}

const app = express();
app.set('trust proxy', 1); // за прокси хостинга (Render) берём реальный IP клиента
app.use(express.json({ limit: '200kb' }));

// Простой лимит запросов по IP в памяти процесса: защищает квоту Gemini на публичном сайте
const hits = new Map(); // ip -> { minute, minuteCount, day, dayCount }
function rateLimit(req, res, next) {
  const now = Date.now();
  const minute = Math.floor(now / 60_000);
  const day = Math.floor(now / 86_400_000);
  const h = hits.get(req.ip) || { minute, minuteCount: 0, day, dayCount: 0 };
  if (h.minute !== minute) Object.assign(h, { minute, minuteCount: 0 });
  if (h.day !== day) Object.assign(h, { day, dayCount: 0 });
  if (h.minuteCount >= RATE_PER_MINUTE) {
    return res.status(429).json({ error: 'Слишком много запросов. Подождите минуту.' });
  }
  if (h.dayCount >= RATE_PER_DAY) {
    return res.status(429).json({ error: 'Дневной лимит запросов исчерпан. Возвращайтесь завтра!' });
  }
  h.minuteCount++;
  h.dayCount++;
  hits.set(req.ip, h);
  next();
}
setInterval(() => {
  const day = Math.floor(Date.now() / 86_400_000);
  for (const [ip, h] of hits) if (h.day !== day) hits.delete(ip);
}, 3_600_000).unref();

app.post('/api/chat', rateLimit, async (req, res) => {
  const { status, body } = await handleChat(req.body?.messages);
  res.status(status).json(body);
});

app.get('/api/health', (_req, res) => res.json({ ok: true, models: models() }));

// В продакшене отдаём собранный фронтенд
const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => console.log(`ÆNGLISC HORD API: http://localhost:${PORT}`));
