import { NextRequest, NextResponse } from "next/server";
import {
  backendProxyUrl,
  rewriteProxyLocation,
  shouldProxyToBackend,
} from "@/lib/backend-proxy";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!shouldProxyToBackend(pathname)) {
    return NextResponse.next();
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
    "/admin",
    "/admin/:path*",
    "/filament/:path*",
    "/storage/:path*",
    "/api/:path*",
    "/css/:path*",
    "/js/:path*",
    "/fonts/:path*",
    "/:segment/:path*",
  ],
};
