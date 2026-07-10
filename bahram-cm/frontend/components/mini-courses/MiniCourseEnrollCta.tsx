'use client';

import { useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { useStudentAuthOptional } from '@/components/student-panel/auth/StudentAuthContext';
import { Button, LinkButton } from '@/components/ui/Button';
import { enrollMiniCourseAction } from '@/lib/student/miniCourseActions';

type MiniCourseEnrollCtaProps = {
  slug: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  enrollmentNumber?: string | null;
  variant?: 'default' | 'hero' | 'overlay';
};

export function MiniCourseEnrollCta({
  slug,
  isLoggedIn,
  isEnrolled,
  enrollmentNumber,
  variant = 'default',
}: MiniCourseEnrollCtaProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const auth = useStudentAuthOptional();
  const redirectTo = `/mini-courses/${slug}`;
  const isOverlay = variant === 'overlay';
  const isHero = variant === 'hero' || isOverlay;

  const openLoginModal = useCallback(() => {
    if (auth?.openLogin) {
      auth.openLogin({ redirectTo });
      return;
    }
    router.push(`/panel/login?redirect=${encodeURIComponent(redirectTo)}`);
  }, [auth, redirectTo, router]);

  if (isEnrolled) {
    const panelHref = '/panel/courses';

    if (isOverlay) {
      return (
        <LinkButton
          href={panelHref}
          variant="primary"
          size="lg"
          withArrow
          className="mini-course-detail-hero__cta-btn"
        >
          مشاهده در پنل
        </LinkButton>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-glow">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          <span>شما در این مینی‌دوره ثبت‌نام کرده‌اید.</span>
        </div>
        {enrollmentNumber ? (
          <p className={isHero ? 'mini-course-detail__order' : 'text-sm text-bone-dim'}>
            شماره سفارش:{' '}
            <span className="num-latin font-medium text-bone" dir="ltr">
              {enrollmentNumber}
            </span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <LinkButton href={panelHref} variant="primary" size="lg" withArrow>
            مشاهده در پنل
          </LinkButton>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    if (isOverlay) {
      return (
        <Button
          type="button"
          variant="primary"
          size="lg"
          withArrow
          className="mini-course-detail-hero__cta-btn"
          onClick={openLoginModal}
        >
          شرکت در مینی‌دوره
        </Button>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {!isHero ? (
          <p className="text-sm leading-relaxed text-bone-dim">
            برای شرکت در این مینی‌دوره رایگان، ابتدا وارد حساب کاربری شوید یا ثبت‌نام کنید.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="primary" size="lg" withArrow onClick={openLoginModal}>
            شرکت در مینی‌دوره
          </Button>
        </div>
      </div>
    );
  }

  if (isOverlay) {
    return (
      <Button
        type="button"
        variant="primary"
        size="lg"
        withArrow
        disabled={pending}
        className="mini-course-detail-hero__cta-btn"
        onClick={() => {
          startTransition(async () => {
            const result = await enrollMiniCourseAction(slug);
            if (result?.ok === false) {
              window.alert(result.message);
            }
          });
        }}
      >
        {pending ? 'در حال فعال‌سازی…' : 'شرکت در مینی‌دوره'}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!isHero ? (
        <p className="text-sm leading-relaxed text-bone-dim">
          با زدن دکمه زیر، این مینی‌دوره برای شما فعال می‌شود و در بخش «دوره‌های من» پنل نمایش داده
          می‌شود.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="primary"
          size="lg"
          withArrow
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await enrollMiniCourseAction(slug);
              if (result?.ok === false) {
                window.alert(result.message);
              }
            });
          }}
        >
          {pending ? 'در حال فعال‌سازی…' : 'شرکت در مینی‌دوره'}
        </Button>
      </div>
    </div>
  );
}
