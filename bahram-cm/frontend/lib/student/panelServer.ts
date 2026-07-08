import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { panelLoginRedirectTarget } from '@/lib/student/panelAuth';
import { studentFetch } from '@/lib/student/session';

function isUnauthorized(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status: number }).status === 401
  );
}

/** Mark all notifications read during server render (no cache revalidation). */
export async function markAllNotificationsReadQuiet(): Promise<void> {
  try {
    await studentFetch('/notifications/read-all', { method: 'POST' });
  } catch {
    // best effort
  }
}

/** Student API fetch for panel pages; redirects to login when the session is invalid. */
export async function panelStudentFetch<T>(
  path: string,
  options?: Parameters<typeof studentFetch>[1],
): Promise<T> {
  try {
    return await studentFetch<T>(path, options);
  } catch (error) {
    if (isUnauthorized(error)) {
      const pathname = (await headers()).get('x-pathname') ?? '/panel';
      const redirectTo = panelLoginRedirectTarget(pathname);
      redirect(`/panel/login?redirect=${encodeURIComponent(redirectTo)}`);
    }
    throw error;
  }
}
