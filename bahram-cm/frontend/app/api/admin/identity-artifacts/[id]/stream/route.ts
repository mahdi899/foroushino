import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SERVER_API_URL } from '@/lib/api/config';
import { ADMIN_TOKEN_COOKIE } from '@/lib/auth/session';

/** Proxy authenticated identity artifact streams for admin document review. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const artifactId = Number(id);
  if (!Number.isFinite(artifactId)) {
    return NextResponse.json({ error: 'Invalid artifact id' }, { status: 400 });
  }

  const jar = await cookies();
  const token = jar.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const upstream = await fetch(`${SERVER_API_URL}/identity-artifacts/${artifactId}/stream`, {
    headers: {
      Accept: '*/*',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: 'Artifact not available' }, { status: upstream.status });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  const disposition = upstream.headers.get('content-disposition');
  if (contentType) headers.set('Content-Type', contentType);
  if (disposition) headers.set('Content-Disposition', disposition);
  headers.set('Cache-Control', 'private, no-store');

  return new NextResponse(upstream.body, { status: 200, headers });
}
