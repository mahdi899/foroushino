import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!can(user, 'orders.view')) {
    redirect('/admin');
  }

  return children;
}
