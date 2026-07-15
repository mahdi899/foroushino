import { Suspense } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PanelPageFallback } from '@/components/student-panel/layout/PanelPageFallback';
import { PanelShell } from '@/components/student-panel/layout/PanelShell';
import { panelLoginRedirectTarget } from '@/lib/student/panelAuth';
import { resolvePanelAccess } from '@/lib/student/session';

export default async function PanelShellLayout({ children }: { children: React.ReactNode }) {
  const { user, blocked } = await resolvePanelAccess();

  if (!user) {
    const pathname = (await headers()).get('x-pathname') ?? '/panel';
    const redirectTo = panelLoginRedirectTarget(pathname);
    const blockedQuery = blocked ? '&blocked=1' : '';
    redirect(`/panel/login?redirect=${encodeURIComponent(redirectTo)}${blockedQuery}`);
  }

  return (
    <PanelShell user={user} unreadCount={0}>
      <Suspense fallback={<PanelPageFallback />}>{children}</Suspense>
    </PanelShell>
  );
}
