import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { FamilyBrandLogo } from '@/components/family/FamilyBrandLogo';
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
      <div className="mb-6 w-full max-w-sm text-center lg:max-w-md">
        <FamilyBrandLogo className="mx-auto mb-4" size="md" priority />
        <h1 className="text-lg font-bold text-bone">خانواده داداش بهرام</h1>
        <p className="mt-1 text-sm text-bone/60">برای ورود، شماره موبایلت رو تأیید کن.</p>
      </div>
      <StudentLoginForm redirectTo={redirectTo} variant="page" active />
    </main>
  );
}
