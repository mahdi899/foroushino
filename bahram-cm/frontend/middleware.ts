import { NextRequest, NextResponse } from "next/server";
import {
  backendProxyUrl,
  rewriteProxyLocation,
  shouldProxyToBackend,
} from "@/lib/backend-proxy";
import { buildCdnCacheControl, buildPublicCacheControl, CDN_MEDIA_EDGE } from "@/lib/cache/headers";
import { getMiddlewarePerfConfig } from "@/lib/cache/middlewarePerf";
import { isLongCacheMediaPath } from "@/lib/cache/cdnHeaders";
import { isStaticContentPath } from "@/lib/cache/staticScope";
import { mediaPathToStorage } from "@/lib/media/legacyMap";

function isPublicHtmlDocument(pathname: string): boolean {
  if (!isStaticContentPath(pathname)) {
    return false;
  }
  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return false;
  }
  return true;
}

async function applyPublicCacheHeaders(response: NextResponse, pathname: string): Promise<NextResponse> {
  if (!isPublicHtmlDocument(pathname)) {
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

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Legacy Next `/public/media/*` → gallery storage (Laravel `/storage/media/site/*`).
  if (pathname.startsWith('/media/') || pathname.startsWith('/images/')) {
    const storagePath = mediaPathToStorage(pathname);
    if (storagePath !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = storagePath;
      return NextResponse.redirect(url, 308);
    }
  }

  if (!shouldProxyToBackend(pathname)) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return applyPublicCacheHeaders(response, pathname);
  }

  const backendOrigin = backendProxyUrl();
  const target = new URL(`${pathname}${search}`, backendOrigin);
  const publicOrigin = request.nextUrl.origin;

  const headers = new Headers(request.headers);
  headers.set("X-Forwarded-Host", request.headers.get("host") ?? "localhost:3000");
  headers.set("X-Forwarded-Proto", request.nextUrl.protocol.replace(":", ""));
  headers.set("X-Forwarded-For", request.headers.get("x-forwarded-for") ?? "127.0.0.1");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
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
    "/storage/:path*",
    "/api/:path*",
    "/cdn/:path*",
    "/css/:path*",
    "/js/:path*",
    "/fonts/:path*",
    "/:segment/:path*",
  ],
};
