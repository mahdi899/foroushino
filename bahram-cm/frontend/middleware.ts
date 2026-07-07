import { NextRequest, NextResponse } from "next/server";
import {
  backendProxyUrl,
  rewriteProxyLocation,
  shouldProxyToBackend,
} from "@/lib/backend-proxy";
import { buildCdnCacheControl, buildPublicCacheControl } from "@/lib/cache/headers";
import { getMiddlewarePerfConfig } from "@/lib/cache/middlewarePerf";
import { isStaticContentPath } from "@/lib/cache/staticScope";

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

  // /manage is only for Filament embed + assets — users always use /admin
  if (pathname === '/manage' || pathname === '/manage/') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  if (pathname === '/manage/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
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
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const backendResponse = await fetch(target, init);
  const responseHeaders = new Headers(backendResponse.headers);

  const location = responseHeaders.get("location");
  if (location) {
    responseHeaders.set("location", rewriteProxyLocation(location, publicOrigin, backendOrigin));
  }

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}

export const config = {
  matcher: [
    "/manage",
    "/manage/:path*",
    "/filament/:path*",
    "/storage/:path*",
    "/api/:path*",
    "/cdn/:path*",
    "/css/:path*",
    "/js/:path*",
    "/fonts/:path*",
    "/:segment/:path*",
  ],
};
