import { SERVER_API_URL } from '@/lib/api/config';

export async function GET() {
  try {
    const res = await fetch(`${SERVER_API_URL}/captcha/config`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch {
    return Response.json(
      {
        data: {
          enabled: true,
          site_key: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '',
          has_turnstile: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()),
        },
      },
      { status: 200 },
    );
  }
}
