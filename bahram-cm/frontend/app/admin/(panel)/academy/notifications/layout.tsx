import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';

export default async function NotificationsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!can(user, 'sms.view')) {
    redirect('/admin');
  }

  return children;
}
