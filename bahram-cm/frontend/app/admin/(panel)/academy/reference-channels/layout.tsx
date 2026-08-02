import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';

export default async function ReferenceChannelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!can(user, 'content.view')) {
    redirect('/admin');
  }

  return children;
}
