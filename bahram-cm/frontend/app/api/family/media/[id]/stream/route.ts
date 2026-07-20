import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SERVER_API_URL } from '@/lib/api/config';
import { STUDENT_TOKEN_COOKIE } from '@/lib/student/session';

const FORWARD_HEADERS = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'content-disposition',
] as const;

/** Same-origin stream proxy — adds auth cookie, forwards Range for video/voice. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const mediaId = Number(id);
  if (!Number.isFinite(mediaId) || mediaId <= 0) {
    return NextResponse.json({ error: 'Invalid media id' }, { status: 400 });
  }

  const jar = await cookies();
  const token = jar.get(STUDENT_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const upstreamHeaders: Record<string, string> = {
    Accept: '*/*',
    Authorization: `Bearer ${token}`,
  };

  const range = request.headers.get('range');
  if (range) upstreamHeaders.Range = range;

  const upstream = await fetch(`${SERVER_API_URL}/family/media/${mediaId}/stream`, {
    headers: upstreamHeaders,
    cache: 'no-store',
  });

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ error: 'Media not available' }, { status: upstream.status });
  }

  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has('accept-ranges')) {
    headers.set('Accept-Ranges', 'bytes');
  }
  if (!headers.has('cache-control')) {
    headers.set('Cache-Control', 'private, max-age=259200');
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}
