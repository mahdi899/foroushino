import { NextResponse } from 'next/server';
import { SERVER_API_URL } from '@/lib/api/config';
import { forwardedClientHeaders } from '@/lib/api/forwardedClientHeaders';

const FORWARD_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'content-length', 'content-range', 'accept-ranges'] as const;

/**
 * Stream a protected upstream response (GET) with Range support.
 */
export async function proxyAuthenticatedStream(
  request: Request,
  upstreamUrl: string,
  authorization: string | undefined,
  cacheControl = 'private, no-store',
): Promise<NextResponse> {
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const upstreamHeaders: Record<string, string> = {
    Accept: '*/*',
    Authorization: authorization,
  };
  const range = request.headers.get('range');
  if (range) upstreamHeaders.Range = range;
  const ifRange = request.headers.get('if-range');
  if (ifRange) upstreamHeaders['If-Range'] = ifRange;

  const upstream = await fetch(upstreamUrl, {
    headers: upstreamHeaders,
    cache: 'no-store',
  });

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ error: 'Media not available' }, { status: upstream.status });
  }

  const headers = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('Cache-Control', cacheControl);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}

/**
 * Forward multipart uploads without buffering the whole body in Next.js.
 */
export async function proxyAuthenticatedMultipartPost(
  request: Request,
  upstreamUrl: string,
  authorization: string | undefined,
): Promise<NextResponse> {
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type');
  const contentLength = request.headers.get('content-length');

  const upstreamHeaders: Record<string, string> = {
    Accept: 'application/json',
    Authorization: authorization,
    ...(await forwardedClientHeaders()),
  };
  if (contentType) upstreamHeaders['Content-Type'] = contentType;
  if (contentLength) upstreamHeaders['Content-Length'] = contentLength;

  const upstream = await fetch(upstreamUrl, {
    method: 'POST',
    headers: upstreamHeaders,
    body: request.body,
    cache: 'no-store',
    duplex: 'half',
  } as RequestInit);

  const responseHeaders = new Headers();
  const upstreamType = upstream.headers.get('content-type');
  if (upstreamType) responseHeaders.set('Content-Type', upstreamType);

  const payload = await upstream.text();

  return new NextResponse(payload, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
