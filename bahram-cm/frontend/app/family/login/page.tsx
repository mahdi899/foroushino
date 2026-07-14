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
    <main id="main-content" className="flex min-h-[100dvh] flex-col items-center justify-center bg-charcoal px-5 py-10">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-xl font-bold text-charcoal">
          خ
        </span>
        <h1 className="text-lg font-bold text-bone">خانواده داداش بهرام</h1>
        <p className="mt-1 text-sm text-bone/60">برای ورود، شماره موبایلت رو تأیید کن.</p>
      </div>
      <StudentLoginForm redirectTo={redirectTo} variant="page" active />
    </main>
  );
}
