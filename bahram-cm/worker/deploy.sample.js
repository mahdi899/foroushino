const BACKEND_ORIGIN = "__BACKEND_ORIGIN__";
const PROXY_SHARED_TOKEN = "__PROXY_SHARED_TOKEN__";
const TELEGRAM_WEBHOOK_SECRET = "__TELEGRAM_WEBHOOK_SECRET__";
const TELEGRAM_API_ORIGIN = "https://api.telegram.org";
const WEBHOOK_PATH_PREFIX = "/api/v1/integrations/telegram/";
const PROXY_ORIGIN_VALUE = "Cloudflare-Worker";
const DEDUPE_TTL_SECONDS = "120";

/**
 * Bahram Telegram Bridge (dumb relay)
 * - Inbound webhook → Laravel (Bearer PROXY_SHARED_TOKEN)
 * - Outbound Bot API with Bearer PROXY_SHARED_TOKEN
 * - No bot token on the proxy (security)
 */
export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, resolveConfig(env), ctx);
    } catch {
      return new Response("Internal Worker Error", { status: 500 });
    }
  },
};

function resolveConfig(env) {
  return {
    backendOrigin: String(env.BACKEND_ORIGIN || BACKEND_ORIGIN).replace(/\/+$/, ""),
    proxySharedToken: String(env.PROXY_SHARED_TOKEN || PROXY_SHARED_TOKEN),
    webhookSecret: String(env.TELEGRAM_WEBHOOK_SECRET || TELEGRAM_WEBHOOK_SECRET),
    telegramApiOrigin: String(env.TELEGRAM_API_ORIGIN || TELEGRAM_API_ORIGIN).replace(/\/+$/, ""),
    webhookPathPrefix: String(env.WEBHOOK_PATH_PREFIX || WEBHOOK_PATH_PREFIX),
    proxyOriginValue: String(env.PROXY_ORIGIN_VALUE || PROXY_ORIGIN_VALUE),
    dedupeTtlSeconds: String(env.DEDUPE_TTL_SECONDS || DEDUPE_TTL_SECONDS),
    dedupe: env.TELEGRAM_DEDUPE || null,
  };
}

async function handleRequest(request, config, ctx) {
  const url = new URL(request.url);

  if (isTelegramApiProxyPath(url.pathname)) {
    return handleTelegramApiProxy(request, config, url);
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!url.pathname.startsWith(config.webhookPathPrefix) || !url.pathname.endsWith("/webhook")) {
    return new Response("Not Found", { status: 404 });
  }

  const botKey = url.pathname.slice(config.webhookPathPrefix.length).replace(/\/webhook$/, "");
  if (!botKey || botKey.includes("/")) {
    return new Response("Not Found", { status: 404 });
  }

  const providedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
  if (!config.webhookSecret || !timingSafeEqual(config.webhookSecret, providedSecret)) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!config.proxySharedToken || !config.backendOrigin) {
    return new Response("Worker Misconfigured", { status: 500 });
  }

  const bodyText = await request.text();
  let update;
  try {
    update = JSON.parse(bodyText);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (typeof update.update_id !== "number") {
    return jsonResponse({ ok: true });
  }

  const dedupeKey = `tg:${botKey}:${update.update_id}`;
  if (await isDuplicate(config, dedupeKey)) {
    return jsonResponse({ ok: true });
  }

  const forwardUrl = config.backendOrigin + url.pathname + (url.search || "");
  const forwardHeaders = new Headers();
  forwardHeaders.set("Content-Type", request.headers.get("Content-Type") || "application/json");
  forwardHeaders.set("X-Telegram-Bot-Api-Secret-Token", providedSecret);
  forwardHeaders.set("Authorization", `Bearer ${config.proxySharedToken}`);
  forwardHeaders.set("X-Proxy-Origin", config.proxyOriginValue);

  let backendResponse;
  try {
    backendResponse = await fetch(forwardUrl, {
      method: "POST",
      headers: forwardHeaders,
      body: bodyText,
    });
  } catch {
    return new Response("Upstream Unreachable", { status: 502 });
  }

  await markSeen(config, dedupeKey, ctx);

  return new Response(await backendResponse.text(), {
    status: backendResponse.status,
    headers: { "Content-Type": backendResponse.headers.get("Content-Type") || "application/json" },
  });
}

async function handleTelegramApiProxy(request, config, url) {
  const provided = request.headers.get("Authorization") || "";
  if (!config.proxySharedToken || !timingSafeEqual(`Bearer ${config.proxySharedToken}`, provided)) {
    return new Response("Forbidden", { status: 403 });
  }

  const target = config.telegramApiOrigin + url.pathname + (url.search || "");
  const forwardHeaders = new Headers();
  for (const name of ["content-type", "content-length", "accept"]) {
    const value = request.headers.get(name);
    if (value) {
      forwardHeaders.set(name, value);
    }
  }

  const init = {
    method: request.method,
    headers: forwardHeaders,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  let upstream;
  try {
    upstream = await fetch(target, init);
  } catch {
    return new Response("Telegram API Unreachable", { status: 502 });
  }

  const responseHeaders = new Headers(upstream.headers);
  const contentType = upstream.headers.get("Content-Type");
  if (contentType) {
    responseHeaders.set("Content-Type", contentType);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

function isTelegramApiProxyPath(pathname) {
  return pathname.startsWith("/bot") || pathname.startsWith("/file/bot");
}

async function isDuplicate(config, key) {
  if (!config.dedupe) {
    return false;
  }
  try {
    return (await config.dedupe.get(key)) !== null;
  } catch {
    return false;
  }
}

async function markSeen(config, key, ctx) {
  if (!config.dedupe) {
    return;
  }
  const ttl = Math.max(30, parseInt(config.dedupeTtlSeconds, 10) || 120);
  const task = config.dedupe.put(key, "1", { expirationTtl: ttl }).catch(() => {});
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(task);
  } else {
    await task;
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
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
