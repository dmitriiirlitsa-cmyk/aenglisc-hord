// Cloudflare Worker: отвечает на /api/*, всё остальное — собранный сайт из dist (env.ASSETS).
import { handleChat, models } from '../server/chat.js';
import { startGitHubLogin, finishGitHubLogin } from './github-oauth.js';

const json = (body, status = 200) => Response.json(body, { status });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/api/chat': {
        if (request.method !== 'POST') return json({ error: 'Используйте POST' }, 405);
        let messages;
        try {
          ({ messages } = await request.json());
        } catch {
          return json({ error: 'Некорректный JSON' }, 400);
        }
        const { status, body } = await handleChat(messages, { env });
        return json(body, status);
      }
      case '/api/health':
        return json({ ok: true, models: models(env), key: Boolean(env.GEMINI_API_KEY) });
      // Вход в админку «Грамматики» через GitHub (Decap CMS)
      case '/api/auth':
        return startGitHubLogin(request, env);
      case '/api/callback':
        return finishGitHubLogin(request, env);
    }

    if (url.pathname.startsWith('/api/')) return json({ error: 'Не найдено' }, 404);
    if (url.pathname === '/admin/config.yml') return adminConfig(request, env, url.origin);
    return env.ASSETS.fetch(request);
  },
};

// Настройки админки: вход через этот же воркер (/api/auth) и адрес сайта — текущий домен
async function adminConfig(request, env, origin) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;
  const yml = (await asset.text())
    .replace(/^(\s*)name: github\s*$/m, `$1name: github\n$1base_url: ${origin}\n$1auth_endpoint: api/auth`)
    .replace(/^(site_url|display_url): .*$/gm, `$1: ${origin}`);
  return new Response(yml, { headers: { 'Content-Type': 'text/yaml; charset=utf-8', 'Cache-Control': 'no-store' } });
}
