import { cookies } from 'next/headers';
import { SERVER_API_URL } from '@/lib/api/config';
import { STUDENT_TOKEN_COOKIE } from '@/lib/student/session';
import { proxyAuthenticatedMultipartPost } from '@/lib/media/proxyAuthenticatedStream';

/** Stream multipart identity artifact uploads to Laravel (large selfie videos). */
export async function POST(request: Request) {
  const jar = await cookies();
  const token = jar.get(STUDENT_TOKEN_COOKIE)?.value;

  return proxyAuthenticatedMultipartPost(
    request,
    `${SERVER_API_URL}/student/identity-verification/artifacts`,
    token ? `Bearer ${token}` : undefined,
  );
}
