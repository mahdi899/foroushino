import { NextRequest, NextResponse } from "next/server";
import {
  backendProxyUrl,
  isNextApiHandlerPath,
  isPublicCdnMediaPath,
  rewriteProxyLocation,
  shouldProxyToBackend,
  toBackendPath,
} from "@/lib/backend-proxy";
import { buildCdnCacheControl, buildPublicCacheControl, CDN_MEDIA_EDGE } from "@/lib/cache/headers";
import { getMiddlewarePerfConfig } from "@/lib/cache/middlewarePerf";
import { isLongCacheMediaPath } from "@/lib/cache/cdnHeaders";
import { isStaticContentPath } from "@/lib/cache/staticScope";
import { mediaPathToStorage } from "@/lib/media/legacyMap";
import { APP_DOMAIN, appPublicOrigin, DUAL_DOMAIN_ENABLED, familyPublicOrigin, FAMILY_DOMAIN } from "@/lib/domains";
import { MEDIA_ORIGIN } from "@/lib/api/config";

const STUDENT_TOKEN_COOKIE = "bahram_student_token";

function hostnameOf(request: NextRequest): string {
  return (request.headers.get("host") ?? request.nextUrl.hostname).split(":")[0]!;
}

/** Cloudflare sets CF-IPCountry; keep family on rostami.app/family inside Iran. */
function isIranEdgeRequest(request: NextRequest): boolean {
  return request.headers.get("cf-ipcountry")?.toUpperCase() === "IR";
}

/** Paths that must never be rewritten into `/family/**` on the club apex (assets, PWA files, API). */
function isFamilyRewriteExempt(pathname: string): boolean {
  if (pathname.startsWith("/family") || pathname.startsWith("/sso")) return true;
  // Student panel lives on rostami.app — never rewrite to /family/panel (404).
  if (pathname === "/panel" || pathname.startsWith("/panel/")) return true;
  // Flutter Family Manager admin — served by nginx → :7358 on rostami.club, not Next.js.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname.startsWith("/_next") || pathname.includes(".")) return true;
  if (pathname === "/icon" || pathname === "/apple-icon") return true;
  return false;
}

/** One-time SSO bridge token — see backend `SsoBridgeController`. */
async function issueSsoBridgeToken(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(STUDENT_TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${backendProxyUrl()}/api/v1/student/auth/sso/bridge`, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { bridge_token?: string } };
    return json?.data?.bridge_token ?? null;
  } catch {
    return null;
  }
}

/** rostami.app/family/** → rostami.club (SSO bridge if logged in, else /login). */
async function redirectToFamilyDomain(request: NextRequest, pathname: string, search: string): Promise<NextResponse> {
  const targetPath = pathname === "/family" ? "/" : pathname.replace(/^\/family/, "") || "/";
  const bridgeToken = await issueSsoBridgeToken(request);

  if (!bridgeToken) {
    return NextResponse.redirect(`${familyPublicOrigin()}/login`);
  }

  const next = encodeURIComponent(targetPath + search);
  return NextResponse.redirect(`${familyPublicOrigin()}/sso/bridge?bt=${encodeURIComponent(bridgeToken)}&next=${next}`);
}

/** rostami.club/panel/** → rostami.app (SSO bridge if logged in, else /panel login). */
async function redirectToAppDomain(request: NextRequest, pathname: string, search: string): Promise<NextResponse> {
  const bridgeToken = await issueSsoBridgeToken(request);

  if (!bridgeToken) {
    return NextResponse.redirect(`${appPublicOrigin()}${pathname}${search}`);
  }

  const next = encodeURIComponent(pathname + search);
  return NextResponse.redirect(`${appPublicOrigin()}/sso/bridge?bt=${encodeURIComponent(bridgeToken)}&next=${next}`);
}

function isMiniCourseDetailPath(pathname: string): boolean {
  return /^\/mini-courses\/[^/]+$/.test(pathname);
}

function hasStudentSession(request: NextRequest): boolean {
  return Boolean(request.cookies.get(STUDENT_TOKEN_COOKIE)?.value);
}

function isPublicHtmlDocument(pathname: string): boolean {
  if (!isStaticContentPath(pathname)) {
    return false;
  }
  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return false;
  }
  return true;
}

async function applyPublicCacheHeaders(
  response: NextResponse,
  pathname: string,
  request: NextRequest,
): Promise<NextResponse> {
  if (!isPublicHtmlDocument(pathname)) {
    return response;
  }

  if (hasStudentSession(request) && isMiniCourseDetailPath(pathname)) {
    response.headers.set("Cache-Control", "private, no-store, must-revalidate");
    response.headers.delete("CDN-Cache-Control");
    return response;
  }

  try {
    const perf = await getMiddlewarePerfConfig();
    response.headers.set("Cache-Control", buildPublicCacheControl(perf));
    const cdn = buildCdnCacheControl(perf);
    if (cdn) {
      response.headers.set("CDN-Cache-Control", cdn);
    }
  } catch {
    /* keep default Next headers */
  }

  return response;
}

/** /media/family|site/* → CDN upstream (mirrors rostami.club nginx — not local storage). */
async function proxyPublicMediaToCdn(
  request: NextRequest,
  pathname: string,
  search: string,
): Promise<NextResponse> {
  if (!MEDIA_ORIGIN) {
    return new NextResponse("CDN not configured", { status: 502 });
  }

  const cdnTarget = new URL(`${pathname}${search}`, MEDIA_ORIGIN);
  const range = request.headers.get("range");
  const ifRange = request.headers.get("if-range");

  const cdnHeaders = new Headers();
  if (range) cdnHeaders.set("Range", range);
  if (ifRange) cdnHeaders.set("If-Range", ifRange);

  let cdnResponse: Response;
  try {
    cdnResponse = await fetch(cdnTarget, {
      method: request.method,
      headers: cdnHeaders,
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return new NextResponse("CDN unavailable", { status: 502 });
  }

  const headers = new Headers(cdnResponse.headers);
  // Download host sends attachment — force inline so <audio>/<video> play instead of downloading.
  headers.set("Content-Disposition", "inline");
  if (!headers.has("Accept-Ranges")) {
    headers.set("Accept-Ranges", "bytes");
  }

  return new NextResponse(cdnResponse.body, {
    status: cdnResponse.status,
    statusText: cdnResponse.statusText,
    headers,
  });
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Family/site CDN assets — proxy before legacy gallery redirects.
  if (isPublicCdnMediaPath(pathname)) {
    return proxyPublicMediaToCdn(request, pathname, search);
  }

  // Legacy Next `/public/media/*` → gallery storage (Laravel `/storage/media/site/*`).
  if (pathname.startsWith('/media/') || pathname.startsWith('/images/')) {
    const storagePath = mediaPathToStorage(pathname);
    if (storagePath !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = storagePath;
      return NextResponse.redirect(url, 308);
    }
  }

  const hostname = hostnameOf(request);

  // Student panel on club → main app (works even when rewrite env is partially missing).
  if (
    FAMILY_DOMAIN &&
    APP_DOMAIN &&
    hostname === FAMILY_DOMAIN &&
    (pathname === "/panel" || pathname.startsWith("/panel/"))
  ) {
    return redirectToAppDomain(request, pathname, search);
  }

  // Option B dual-domain routing — rostami.app ↔ rostami.club (see helpers above).
  if (DUAL_DOMAIN_ENABLED) {
    if (
      hostname === APP_DOMAIN &&
      (pathname === "/family" || pathname.startsWith("/family/")) &&
      !isIranEdgeRequest(request)
    ) {
      return redirectToFamilyDomain(request, pathname, search);
    }

    if (hostname === FAMILY_DOMAIN && !isFamilyRewriteExempt(pathname) && !shouldProxyToBackend(pathname)) {
      const url = request.nextUrl.clone();
      const rewritten = pathname === "/" ? "/family" : `/family${pathname}`;
      url.pathname = rewritten;
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-pathname", rewritten);
      requestHeaders.set("x-family-host", "1");
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
  }

  // Do not decorate Next App Router API handlers — setting headers here can
  // make nested `/api/.../...` routes fall through to the HTML not-found page
  // under Next 16 + Turbopack.
  if (isNextApiHandlerPath(pathname)) {
    return NextResponse.next();
  }

  if (!shouldProxyToBackend(pathname)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return applyPublicCacheHeaders(response, pathname, request);
  }

  const backendOrigin = backendProxyUrl();
  const target = new URL(`${toBackendPath(pathname)}${search}`, backendOrigin);
  const publicOrigin = request.nextUrl.origin;

  const headers = new Headers(request.headers);
  headers.set("X-Forwarded-Host", request.headers.get("host") ?? "localhost:3000");
  headers.set("X-Forwarded-Proto", request.nextUrl.protocol.replace(":", ""));
  headers.set("X-Forwarded-For", request.headers.get("x-forwarded-for") ?? "127.0.0.1");

  // Large family-manager media uploads (chunked, but still slow on mobile
  // networks) need more headroom than the default page/API timeout — nginx
  // also fast-paths this prefix straight to PHP-FPM (see deploy/nginx).
  const isFamilyMediaUpload = pathname.startsWith("/api/v1/family-manager/media");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(isFamilyMediaUpload ? 120_000 : 15_000),
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(target, init);
  } catch {
    return new NextResponse("Backend unavailable", { status: 502 });
  }
  const responseHeaders = new Headers(backendResponse.headers);

  const location = responseHeaders.get("location");
  if (location) {
    responseHeaders.set("location", rewriteProxyLocation(location, publicOrigin, backendOrigin));
  }

  if (isLongCacheMediaPath(pathname) && !responseHeaders.has("CDN-Cache-Control")) {
    responseHeaders.set("CDN-Cache-Control", CDN_MEDIA_EDGE);
  }

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}

export const config = {
  matcher: [
    "/",
    "/storage/:path*",
    "/media/:path*",
    "/api/:path*",
    "/cdn/:path*",
    "/css/:path*",
    "/js/:path*",
    "/fonts/:path*",
    "/:segment/:path*",
  ],
};
