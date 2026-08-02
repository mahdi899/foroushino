import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';

export default async function SeoLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!can(user, 'settings.view')) {
    redirect('/admin');
  }

  return children;
}
