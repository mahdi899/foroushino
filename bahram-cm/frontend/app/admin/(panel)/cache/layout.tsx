import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';

export default async function CacheLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!can(user, 'settings.manage')) {
    redirect('/admin');
  }

  return children;
}
