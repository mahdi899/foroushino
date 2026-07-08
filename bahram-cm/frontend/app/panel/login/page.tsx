import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PanelLoginView } from '@/components/student-panel/auth/PanelLoginView';
import { panelLoginRedirectTarget } from '@/lib/student/panelAuth';
import { getCurrentStudent } from '@/lib/student/session';

export const metadata: Metadata = {
  title: 'ورود به پنل | آکادمی بهرام رستمی',
  robots: { index: false, follow: false },
};

export default async function PanelLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  const redirectTo = panelLoginRedirectTarget(redirectParam);
  const user = await getCurrentStudent();

  if (user) {
    redirect(redirectTo);
  }

  return <PanelLoginView redirectTo={redirectTo} />;
}
