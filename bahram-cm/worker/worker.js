/**
 * Telegram webhook relay — secrets only in Cloudflare Variables (not in this file).
 */

const WEBHOOK_PREFIX = '/api/v1/integrations/telegram/';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);

    if (!url.pathname.startsWith(WEBHOOK_PREFIX) || !url.pathname.endsWith('/webhook')) {
      return new Response('Not Found', { status: 404 });
    }

    const botKey = url.pathname.slice(WEBHOOK_PREFIX.length).replace(/\/webhook$/, '');
    if (!botKey || botKey.includes('/')) {
      return new Response('Not Found', { status: 404 });
    }

    const backend = (env.BACKEND_ORIGIN || '').replace(/\/+$/, '');
    const bearer = env.PROXY_SHARED_TOKEN || '';
    if (!backend || !bearer) {
      return new Response('Worker Misconfigured', { status: 500 });
    }

    const body = await request.text();
    const incomingSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    if (typeof payload.update_id !== 'number') {
      return json({ ok: true });
    }

    const target = backend + url.pathname + url.search;

    let upstream;
    try {
      upstream = await fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Bot-Api-Secret-Token': incomingSecret,
          Authorization: `Bearer ${bearer}`,
          'X-Proxy-Origin': 'Cloudflare-Worker',
        },
        body,
      });
    } catch {
      return new Response('Upstream Unreachable', { status: 502 });
    }

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
    });
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
