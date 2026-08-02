import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PanelShell } from '@/components/student-panel/layout/PanelShell';
import { panelLoginRedirectTarget } from '@/lib/student/panelAuth';
import { getPanelUnreadCount, resolvePanelAccess } from '@/lib/student/session';

export default async function PanelShellLayout({ children }: { children: React.ReactNode }) {
  const [{ user, blocked }, unreadCount] = await Promise.all([
    resolvePanelAccess(),
    getPanelUnreadCount(),
  ]);

  if (!user) {
    const pathname = (await headers()).get('x-pathname') ?? '/panel';
    const redirectTo = panelLoginRedirectTarget(pathname);
    const blockedQuery = blocked ? '&blocked=1' : '';
    redirect(`/panel/login?redirect=${encodeURIComponent(redirectTo)}${blockedQuery}`);
  }

  // Page loading UI lives in ./loading.tsx — avoid a second Suspense fallback here
  // or first entry flashes full-shell loader then inset loader.
  return <PanelShell user={user} unreadCount={unreadCount}>{children}</PanelShell>;
}
