import { SERVER_API_URL } from '@/lib/api/config';
import { STUDENT_TOKEN_COOKIE } from '@/lib/student/session';

export async function fetchSavedSpotPlayerX(token: string): Promise<string | null> {
  try {
    const response = await fetch(`${SERVER_API_URL}/student/spotplayer-session`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const json = (await response.json()) as { data?: { x?: string | null } };
    const x = json.data?.x?.trim();
    return x || null;
  } catch {
    return null;
  }
}

export async function persistSpotPlayerX(token: string, x: string): Promise<void> {
  try {
    await fetch(`${SERVER_API_URL}/student/spotplayer-session`, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ x }),
      cache: 'no-store',
    });
  } catch {
    // Best effort — browser cookie still works for the current session.
  }
}

export { STUDENT_TOKEN_COOKIE };
