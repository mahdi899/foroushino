import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { FamilyAuthorAvatar } from '@/components/family/FamilyAuthorAvatar';
import { StudentLoginForm } from '@/components/student-panel/auth/StudentLoginForm';
import { familyFetch } from '@/lib/family/session';
import { getCurrentStudent } from '@/lib/student/session';
import type { FamilyBranding } from '@/lib/family/types';

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

  const brandingResponse = await familyFetch<{ data: FamilyBranding }>('/branding').catch(() => null);
  const branding = brandingResponse?.data;
  const familyAvatar = branding?.community_avatar ?? branding?.profile_avatar ?? null;
  const displayName = branding?.display_name ?? 'خانواده داداش بهرام';
  const profileName = branding?.profile_name ?? 'بهرام';

  return (
    <main id="main-content" className="relative flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10 lg:py-16">
      <Link
        href="/family"
        aria-label="بازگشت به خانواده"
        className="family-nav-icon absolute end-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--family-border-subtle)] bg-[var(--family-surface)]/80 text-bone/70 backdrop-blur-sm transition hover:text-[var(--family-accent)] sm:end-5 sm:top-5"
      >
        <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </Link>

      <div className="mb-5 w-full max-w-md text-center">
        <div className="relative mx-auto mb-4 flex w-fit justify-center">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-3 rounded-full bg-gradient-to-tr from-gold/25 via-transparent to-gold/10 opacity-60 blur-md"
          />
          <FamilyAuthorAvatar
            name={profileName}
            avatar={familyAvatar}
            size="xl"
            className="relative shadow-[0_20px_50px_rgba(201,147,10,0.28)] ring-2 ring-gold/25"
          />
        </div>
        <h1 className="text-lg font-bold text-bone lg:text-xl">ورود به {displayName}</h1>
        <p className="mt-1.5 text-sm text-bone/55">شماره موبایلت رو وارد کن تا کد تأیید بفرستیم.</p>
      </div>
      <StudentLoginForm redirectTo={redirectTo} variant="page" active context="family" />
    </main>
  );
}
