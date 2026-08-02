import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';

export default async function TicketsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!can(user, 'tickets.view')) {
    redirect('/admin');
  }

  return children;
}
