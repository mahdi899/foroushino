import { redirect } from 'next/navigation';
import { getCurrentUser, isSuperAdmin } from '@/lib/auth/session';

export default async function AccessRolesLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) {
    redirect('/admin');
  }

  return children;
}
