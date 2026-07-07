import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/student-panel/auth/LoginForm';
import { getCurrentStudent } from '@/lib/student/session';

export const metadata: Metadata = {
  title: 'ورود به پنل کاربری | آکادمی بهرام رستمی',
  robots: { index: false, follow: false },
};

export default async function PanelLoginPage() {
  const user = await getCurrentStudent();
  if (user) {
    redirect('/panel');
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="mb-1 text-center text-xl font-bold text-text">ورود به پنل دانشجویی</h1>
        <p className="mb-6 text-center text-sm text-text-muted">آکادمی بهرام رستمی</p>
        <LoginForm />
      </div>
    </div>
  );
}
