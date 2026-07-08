import { type NextRequest, NextResponse } from 'next/server';
import {
  isSpotPlayerCookieExpired,
  spotPlayerCookieOptions,
  syncSpotPlayerCookie,
} from '@/lib/spotplayer/cookieSync';
import { fetchSavedSpotPlayerX, persistSpotPlayerX, STUDENT_TOKEN_COOKIE } from '@/lib/spotplayer/persistSession';

export async function GET(request: NextRequest) {
  const studentToken = request.cookies.get(STUDENT_TOKEN_COOKIE)?.value;
  let currentX = request.cookies.get('X')?.value;

  // Restore the last synced SpotPlayer cookie for this account after re-login.
  if ((!currentX || isSpotPlayerCookieExpired(currentX)) && studentToken) {
    const savedX = await fetchSavedSpotPlayerX(studentToken);
    if (savedX && !isSpotPlayerCookieExpired(savedX)) {
      currentX = savedX;
    }
  }

  const response = new NextResponse(null, { status: 204 });

  const needsSync = !currentX || isSpotPlayerCookieExpired(currentX);
  let nextX = currentX ?? null;

  if (needsSync) {
    try {
      nextX = await syncSpotPlayerCookie(currentX);
    } catch {
      // Keep the current cookie if SpotPlayer is temporarily unreachable.
    }
  }

  if (nextX) {
    response.cookies.set('X', nextX, spotPlayerCookieOptions);

    if (studentToken) {
      void persistSpotPlayerX(studentToken, nextX);
    }
  }

  return response;
}
