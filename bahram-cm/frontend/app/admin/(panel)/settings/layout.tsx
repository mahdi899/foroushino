import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser, isSuperAdmin } from '@/lib/auth/session';

/** Site settings page only — identity-providers stays available to other roles. */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get('x-pathname') ?? '';

  if (pathname === '/admin/settings') {
    const user = await getCurrentUser();
    if (!isSuperAdmin(user)) {
      redirect('/admin');
    }
  }

  return children;
}
