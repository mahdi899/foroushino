import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentSatUser } from '@/lib/sat/session';
import { SatLoginForm } from './SatLoginForm';

export const metadata: Metadata = {
  title: 'ورود | پنل سات',
  robots: { index: false, follow: false },
};

export default async function SatLoginPage() {
  const user = await getCurrentSatUser();
  if (user) redirect('/sat');

  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian px-4 py-10">
      <SatLoginForm />
    </div>
  );
}
