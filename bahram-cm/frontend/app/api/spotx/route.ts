import { type NextRequest, NextResponse } from 'next/server';

const SPOTPLAYER_ORIGIN = 'https://app.spotplayer.ir';

export async function GET(request: NextRequest) {
  const currentX = request.cookies.get('X')?.value;
  const response = new NextResponse(null, { status: 204 });

  if (!currentX) {
    return response;
  }

  let nextX = currentX;

  try {
    const upstream = await fetch(`${SPOTPLAYER_ORIGIN}/`, {
      method: 'HEAD',
      headers: { Cookie: `X=${currentX}` },
      redirect: 'manual',
      cache: 'no-store',
    });
    const setCookie = upstream.headers.get('set-cookie');
    const match = setCookie?.match(/(?:^|;\s*)X=([^;]+)/);
    if (match?.[1]) nextX = match[1];
  } catch {
    // Keep the current cookie if SpotPlayer is temporarily unreachable.
  }

  response.cookies.set('X', nextX, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
