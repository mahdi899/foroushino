/**
 * Bahram Telegram Bridge — Cloudflare Worker
 *
 * Dumb relay only (no bot token on the proxy):
 *  1. Inbound  — Telegram webhook → Laravel
 *  2. Outbound — Laravel → api.telegram.org (Bearer PROXY_SHARED_TOKEN)
 *  3. Host sync — Laravel (Iran) → telegram/host-sync.php when Iran
 *     cannot reach bahram.rahai.online directly (Bearer host_sync_secret)
 *
 * Secrets: PROXY_SHARED_TOKEN
 * Webhook secret is validated on Laravel; Worker forwards it as-is.
 */

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (error) {
      console.error('bahram-telegram-bridge unhandled error', error);

      return new Response('Internal Worker Error', { status: 500 });
    }
  },
};

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const pathPrefix = env.WEBHOOK_PATH_PREFIX || '/api/v1/integrations/telegram/';

  if (isTelegramApiProxyPath(url.pathname)) {
    return handleTelegramApiProxy(request, env, url);
  }

  // Iran → external host app (host-sync.php) via Worker when direct path is blocked.
  if (url.pathname === '/host-sync' || url.pathname === '/host-sync/') {
    return handleHostSyncProxy(request, env);
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!url.pathname.startsWith(pathPrefix) || !url.pathname.endsWith('/webhook')) {
    return new Response('Not Found', { status: 404 });
  }

  const botKey = url.pathname.slice(pathPrefix.length).replace(/\/webhook$/, '');
  if (!botKey || botKey.includes('/')) {
    return new Response('Not Found', { status: 404 });
  }

  const proxySharedToken = env.PROXY_SHARED_TOKEN;
  const backendOrigin = (env.BACKEND_ORIGIN || '').replace(/\/+$/, '');

  if (!proxySharedToken || !backendOrigin) {
    console.error('bahram-telegram-bridge misconfigured: missing PROXY_SHARED_TOKEN or BACKEND_ORIGIN');

    return new Response('Worker Misconfigured', { status: 500 });
  }

  const bodyText = await request.text();

  let update;
  try {
    update = JSON.parse(bodyText);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  if (typeof update.update_id !== 'number') {
    return jsonResponse({ ok: true });
  }

  const forwardUrl = backendOrigin + url.pathname + (url.search || '');

  const forwardHeaders = new Headers();
  forwardHeaders.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
  forwardHeaders.set('Authorization', `Bearer ${proxySharedToken}`);
  forwardHeaders.set('X-Proxy-Origin', env.PROXY_ORIGIN_VALUE || 'Cloudflare-Worker');

  const telegramSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (telegramSecret) {
    forwardHeaders.set('X-Telegram-Bot-Api-Secret-Token', telegramSecret);
  }

  let backendResponse;
  try {
    backendResponse = await fetch(forwardUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body: bodyText,
    });
  } catch (error) {
    console.error('bahram-telegram-bridge upstream fetch failed', error);

    return new Response('Upstream Unreachable', { status: 502 });
  }

  const responseBody = await backendResponse.text();

  return new Response(responseBody, {
    status: backendResponse.status,
    headers: { 'Content-Type': backendResponse.headers.get('Content-Type') || 'application/json' },
  });
}

/**
 * Forward Iran host-push requests to the external telegram/ app.
 * Auth is the host_sync_secret Bearer (validated by host-sync.php) — Worker
 * only bridges the network path Iran cannot open directly.
 */
async function handleHostSyncProxy(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const upstream = (env.HOST_SYNC_UPSTREAM || '').replace(/\/+$/, '');
  if (!upstream) {
    return new Response('Worker Misconfigured: HOST_SYNC_UPSTREAM', { status: 500 });
  }

  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ') || auth.length < 20) {
    return new Response('Forbidden', { status: 403 });
  }

  const forwardHeaders = new Headers();
  forwardHeaders.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
  forwardHeaders.set('Accept', 'application/json');
  forwardHeaders.set('Authorization', auth);
  const origin = request.headers.get('X-Proxy-Origin');
  if (origin) {
    forwardHeaders.set('X-Proxy-Origin', origin);
  }

  const body = await request.arrayBuffer();

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(upstream, {
      method: 'POST',
      headers: forwardHeaders,
      body,
    });
  } catch (error) {
    console.error('bahram-telegram-bridge host-sync upstream failed', error);

    return new Response('Host Sync Unreachable', { status: 502 });
  }

  return new Response(await upstreamResponse.text(), {
    status: upstreamResponse.status,
    headers: {
      'Content-Type': upstreamResponse.headers.get('Content-Type') || 'application/json',
    },
  });
}

async function handleTelegramApiProxy(request, env, url) {
  const proxySharedToken = env.PROXY_SHARED_TOKEN || '';
  const provided = request.headers.get('Authorization') || '';

  if (!proxySharedToken || !timingSafeEqual(`Bearer ${proxySharedToken}`, provided)) {
    return new Response('Forbidden', { status: 403 });
  }

  const apiOrigin = (env.TELEGRAM_API_ORIGIN || 'https://api.telegram.org').replace(/\/+$/, '');
  const target = apiOrigin + url.pathname + (url.search || '');

  const forwardHeaders = new Headers();
  for (const name of ['content-type', 'content-length', 'accept']) {
    const value = request.headers.get(name);
    if (value) {
      forwardHeaders.set(name, value);
    }
  }

  const init = {
    method: request.method,
    headers: forwardHeaders,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half';
  }

  let upstream;
  try {
    upstream = await fetch(target, init);
  } catch (error) {
    console.error('bahram-telegram-bridge telegram api proxy failed', error);

    return new Response('Telegram API Unreachable', { status: 502 });
  }

  const responseHeaders = new Headers(upstream.headers);
  const contentType = upstream.headers.get('Content-Type');
  if (contentType) {
    responseHeaders.set('Content-Type', contentType);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

function isTelegramApiProxyPath(pathname) {
  return pathname.startsWith('/bot') || pathname.startsWith('/file/bot');
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function timingSafeEqual(expected, provided) {
  const encoder = new TextEncoder();
  const expectedBytes = encoder.encode(expected);
  const providedBytes = encoder.encode(provided);

  if (expectedBytes.length !== providedBytes.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < expectedBytes.length; i++) {
    mismatch |= expectedBytes[i] ^ providedBytes[i];
  }

  return mismatch === 0;
}
