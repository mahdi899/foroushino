/**
 * Bahram Telegram Relay — Cloudflare Worker
 *
 * Sole responsibility: receive the Telegram webhook at the edge (bypassing
 * any ISP-level filtering of rostami.app inside Iran), authenticate it,
 * filter out anything that isn't a genuine Telegram update, and forward it
 * to Server 1 (rostami.app) over HTTPS with the security headers Laravel's
 * `proxy.origin:strict` middleware requires. This worker must never be used
 * as a general-purpose proxy — it only understands the Telegram webhook
 * path shape and drops everything else.
 */

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (error) {
      console.error('bahram-telegram-relay unhandled error', error);

      return new Response('Internal Worker Error', { status: 500 });
    }
  },
};

async function handleRequest(request, env, ctx) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const pathPrefix = env.WEBHOOK_PATH_PREFIX || '/api/v1/integrations/telegram/';

  // This worker has exactly one job: relay Telegram's webhook. Anything that
  // doesn't match the exact expected path shape is dropped immediately.
  if (!url.pathname.startsWith(pathPrefix) || !url.pathname.endsWith('/webhook')) {
    return new Response('Not Found', { status: 404 });
  }

  const botKey = url.pathname.slice(pathPrefix.length).replace(/\/webhook$/, '');
  if (!botKey || botKey.includes('/')) {
    return new Response('Not Found', { status: 404 });
  }

  const expectedSecret = env.TELEGRAM_WEBHOOK_SECRET;
  const providedSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';

  if (!expectedSecret || !timingSafeEqual(expectedSecret, providedSecret)) {
    return new Response('Forbidden', { status: 403 });
  }

  const proxySharedToken = env.PROXY_SHARED_TOKEN;
  const backendOrigin = (env.BACKEND_ORIGIN || '').replace(/\/+$/, '');

  if (!proxySharedToken || !backendOrigin) {
    console.error('bahram-telegram-relay misconfigured: missing PROXY_SHARED_TOKEN or BACKEND_ORIGIN');

    return new Response('Worker Misconfigured', { status: 500 });
  }

  const bodyText = await request.text();

  let update;
  try {
    update = JSON.parse(bodyText);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // Every genuine Telegram update carries a numeric update_id — reject
  // anything else outright rather than relaying malformed traffic upstream.
  if (typeof update.update_id !== 'number') {
    return jsonResponse({ ok: true });
  }

  const dedupeKey = `tg:${botKey}:${update.update_id}`;

  // Best-effort anti-replay at the edge (defense in depth — Laravel enforces
  // the real uniqueness guarantee via a DB unique index on update_id).
  if (await isDuplicate(env, dedupeKey)) {
    return jsonResponse({ ok: true });
  }

  const forwardUrl = backendOrigin + url.pathname + (url.search || '');

  const forwardHeaders = new Headers();
  forwardHeaders.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
  forwardHeaders.set('X-Telegram-Bot-Api-Secret-Token', providedSecret);
  forwardHeaders.set('Authorization', `Bearer ${proxySharedToken}`);
  forwardHeaders.set('X-Proxy-Origin', env.PROXY_ORIGIN_VALUE || 'Cloudflare-Worker');

  let backendResponse;
  try {
    backendResponse = await fetch(forwardUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body: bodyText,
    });
  } catch (error) {
    console.error('bahram-telegram-relay upstream fetch failed', error);

    // Non-2xx makes Telegram retry the delivery later — fail closed instead
    // of silently swallowing the update.
    return new Response('Upstream Unreachable', { status: 502 });
  }

  await markSeen(env, dedupeKey, ctx);

  const responseBody = await backendResponse.text();

  return new Response(responseBody, {
    status: backendResponse.status,
    headers: { 'Content-Type': backendResponse.headers.get('Content-Type') || 'application/json' },
  });
}

async function isDuplicate(env, key) {
  if (!env.TELEGRAM_DEDUPE) {
    return false;
  }

  try {
    const seen = await env.TELEGRAM_DEDUPE.get(key);

    return seen !== null;
  } catch (error) {
    console.error('bahram-telegram-relay dedupe read failed', error);

    return false;
  }
}

async function markSeen(env, key, ctx) {
  if (!env.TELEGRAM_DEDUPE) {
    return;
  }

  const ttl = Math.max(30, parseInt(env.DEDUPE_TTL_SECONDS || '120', 10) || 120);
  const task = env.TELEGRAM_DEDUPE.put(key, '1', { expirationTtl: ttl }).catch((error) => {
    console.error('bahram-telegram-relay dedupe write failed', error);
  });

  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(task);
  } else {
    await task;
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Constant-time string comparison to avoid leaking secret length/content via timing. */
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
