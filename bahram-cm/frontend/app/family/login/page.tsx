import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { StudentLoginForm } from '@/components/student-panel/auth/StudentLoginForm';
import { getCurrentStudent } from '@/lib/student/session';

export const metadata: Metadata = {
  title: 'ورود | خانواده داداش بهرام',
  robots: { index: false, follow: false },
};

function resolveRedirect(target?: string): string {
  if (target && target.startsWith('/family') && !target.startsWith('//')) return target;
  return '/family';
}

export default async function FamilyLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  const redirectTo = resolveRedirect(redirectParam);
  const user = await getCurrentStudent();

  if (user) {
    redirect(redirectTo);
  }

  return (
    <main id="main-content" className="flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10 lg:py-16">
      <div className="mb-5 w-full max-w-md text-center">
        <h1 className="text-lg font-bold text-bone lg:text-xl">ورود به خانواده</h1>
        <p className="mt-1.5 text-sm text-bone/55">شماره موبایلت رو وارد کن تا کد تأیید بفرستیم.</p>
      </div>
      <StudentLoginForm redirectTo={redirectTo} variant="page" active context="family" />
    </main>
  );
}
