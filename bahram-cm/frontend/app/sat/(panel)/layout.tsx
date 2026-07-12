import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentSatUser } from '@/lib/sat/session';
import { SatShell } from './SatShell';

export const metadata: Metadata = {
  title: 'پنل سات',
  robots: { index: false, follow: false },
};

export default async function SatPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentSatUser();
  if (!user) redirect('/sat/login');

  return <SatShell user={user}>{children}</SatShell>;
}
