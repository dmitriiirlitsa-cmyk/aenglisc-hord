// Вход в админку Decap CMS через GitHub на Cloudflare (на Netlify эту роль играет api.netlify.com).
// Decap открывает окно /api/auth → GitHub спрашивает разрешение → /api/callback меняет код на токен
// и передаёт его окну админки сообщением postMessage — в формате, который ждёт Decap.

// Сайты, админка которых может получить токен (сам воркер добавляется автоматически)
const TRUSTED_ADMIN_ORIGINS = ['https://aenglisc-hord.netlify.app'];
const STATE_COOKIE = 'gh_oauth_state';

export function startGitHubLogin(request, env) {
  if (!env.GITHUB_CLIENT_ID) return new Response('На сервере не задан GITHUB_CLIENT_ID', { status: 500 });
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const github = new URL('https://github.com/login/oauth/authorize');
  github.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  github.searchParams.set('redirect_uri', `${url.origin}/api/callback`);
  github.searchParams.set('scope', url.searchParams.get('scope') || 'repo');
  github.searchParams.set('state', state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: github.toString(),
      // state живёт 10 минут и проверяется на обратном пути — защита от подделки входа
      'Set-Cookie': `${STATE_COOKIE}=${state}; Path=/api; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}

export async function finishGitHubLogin(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const savedState = (request.headers.get('Cookie') || '').match(new RegExp(`${STATE_COOKIE}=([\\w-]+)`))?.[1];

  if (!code || !state || state !== savedState) {
    return reply(url, { error: 'Вход не подтверждён (истёк или подделан). Закройте окно и нажмите «Войти» ещё раз.' });
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'aenglisc-hord-cms' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/callback`,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) {
    return reply(url, { error: data.error_description || 'GitHub не выдал доступ. Проверьте GITHUB_CLIENT_ID и GITHUB_CLIENT_SECRET.' });
  }
  return reply(url, { token: data.access_token });
}

// Страница в окне входа: сообщает админке результат и закрывается
function reply(url, { token, error }) {
  const origins = JSON.stringify([url.origin, ...TRUSTED_ADMIN_ORIGINS]);
  const message = token
    ? `authorization:github:success:${JSON.stringify({ token, provider: 'github' })}`
    : `authorization:github:error:${JSON.stringify({ message: error })}`;
  const html = `<!doctype html><meta charset="utf-8"><title>Вход в админку</title>
<p style="font-family:sans-serif">${token ? 'Готово, окно можно закрыть.' : error}</p>
<script>
  (function () {
    var trusted = ${origins};
    var message = ${JSON.stringify(message)};
    if (!window.opener) return;
    // Decap отвечает на «authorizing», и только тогда отдаём результат — и только своей админке
    window.addEventListener('message', function (e) {
      if (trusted.indexOf(e.origin) === -1) return;
      window.opener.postMessage(message, e.origin);
    }, false);
    window.opener.postMessage('authorizing:github', '*');
  })();
</script>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': `${STATE_COOKIE}=; Path=/api; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}
