import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminShell } from './AdminShell';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'پنل مدیریت بهرام',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');

  return <AdminShell>{children}</AdminShell>;
}
