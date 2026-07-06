import { createFallbackMathChallenge } from '@/lib/captcha/mathChallenge.server';
import { SERVER_API_URL } from '@/lib/api/config';

export async function GET() {
  try {
    const res = await fetch(`${SERVER_API_URL}/captcha/math`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const json = (await res.json()) as { data?: { id?: string; question?: string } };
      if (json.data?.id && json.data?.question) {
        return Response.json(json, {
          headers: { 'Cache-Control': 'no-store' },
        });
      }
    }
  } catch {
    /* fallback below */
  }

  const fallback = await createFallbackMathChallenge();
  if (fallback) {
    return Response.json(
      { data: fallback },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return Response.json({ message: 'Captcha unavailable' }, { status: 503 });
}
