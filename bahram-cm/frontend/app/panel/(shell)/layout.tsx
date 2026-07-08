import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PanelShell } from '@/components/student-panel/layout/PanelShell';
import { panelLoginRedirectTarget } from '@/lib/student/panelAuth';
import { panelStudentFetch } from '@/lib/student/panelServer';
import { getCurrentStudent } from '@/lib/student/session';

export default async function PanelShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentStudent();

  if (!user) {
    const pathname = (await headers()).get('x-pathname') ?? '/panel';
    const redirectTo = panelLoginRedirectTarget(pathname);
    redirect(`/panel/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  const notificationsRes = await panelStudentFetch<{ data: { unread_count: number } }>('/notifications/unread-count').catch(() => ({
    data: { unread_count: 0 },
  }));
  const unreadCount = notificationsRes.data.unread_count;

  return (
    <PanelShell user={user} unreadCount={unreadCount}>
      {children}
    </PanelShell>
  );
}
