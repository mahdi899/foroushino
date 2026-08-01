import { cookies } from 'next/headers';
import { SERVER_API_URL } from '@/lib/api/config';
import { ADMIN_TOKEN_COOKIE } from '@/lib/auth/session';
import { proxyAuthenticatedStream } from '@/lib/media/proxyAuthenticatedStream';

/** Proxy authenticated identity artifact files for admin document review (with Range support). */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const artifactId = Number(id);
  if (!Number.isFinite(artifactId)) {
    return Response.json({ error: 'Invalid artifact id' }, { status: 400 });
  }

  const jar = await cookies();
  const token = jar.get(ADMIN_TOKEN_COOKIE)?.value;

  return proxyAuthenticatedStream(
    request,
    `${SERVER_API_URL}/identity-artifacts/${artifactId}/stream`,
    token ? `Bearer ${token}` : undefined,
  );
}
