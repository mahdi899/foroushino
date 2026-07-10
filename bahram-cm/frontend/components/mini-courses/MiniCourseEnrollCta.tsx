'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Button, LinkButton } from '@/components/ui/Button';
import { fetchMiniCourseEnrollmentStatus } from '@/lib/mini-courses/enrollmentClient';
import { miniCoursePurchasePath } from '@/lib/mini-courses/purchase';

type MiniCourseEnrollCtaProps = {
  slug: string;
  isEnrolled: boolean;
  enrollmentNumber?: string | null;
  variant?: 'default' | 'hero' | 'overlay';
};

export function MiniCourseEnrollCta({
  slug,
  isEnrolled: initialIsEnrolled,
  enrollmentNumber: initialEnrollmentNumber,
  variant = 'default',
}: MiniCourseEnrollCtaProps) {
  const router = useRouter();
  const pathname = usePathname();
  const purchasePath = miniCoursePurchasePath(slug);
  const panelHref = '/panel/courses';
  const isOverlay = variant === 'overlay';
  const isHero = variant === 'hero' || isOverlay;

  const [isEnrolled, setIsEnrolled] = useState(initialIsEnrolled);
  const [enrollmentNumber, setEnrollmentNumber] = useState(initialEnrollmentNumber ?? null);
  const [statusReady, setStatusReady] = useState(initialIsEnrolled);

  const syncEnrollmentStatus = useCallback(async () => {
    const status = await fetchMiniCourseEnrollmentStatus(slug);
    setIsEnrolled(status.enrolled);
    setEnrollmentNumber(status.enrollmentNumber);
    setStatusReady(true);

    if (status.enrolled) {
      router.refresh();
    }
  }, [router, slug]);

  useEffect(() => {
    void syncEnrollmentStatus();
  }, [pathname, slug, syncEnrollmentStatus]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void syncEnrollmentStatus();
      }
    };

    const onPageShow = () => {
      void syncEnrollmentStatus();
    };

    const onFocus = () => {
      void syncEnrollmentStatus();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncEnrollmentStatus]);

  const goToCheckout = () => {
    router.push(purchasePath);
  };

  const showEnrolled = statusReady ? isEnrolled : initialIsEnrolled;

  if (!statusReady && !initialIsEnrolled && isOverlay) {
    return (
      <Button
        type="button"
        variant="primary"
        size="lg"
        withArrow
        className="mini-course-detail-hero__cta-btn"
        disabled
        aria-busy="true"
      >
        در حال بررسی وضعیت…
      </Button>
    );
  }

  if (showEnrolled) {
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

  if (isOverlay) {
    return (
      <Button
        type="button"
        variant="primary"
        size="lg"
        withArrow
        className="mini-course-detail-hero__cta-btn"
        onClick={goToCheckout}
      >
        شرکت در مینی‌دوره
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!isHero ? (
        <p className="text-sm leading-relaxed text-bone-dim">
          برای شرکت در این مینی‌دوره رایگان، ثبت‌نام را از صفحه سفارش تکمیل کنید.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="primary" size="lg" withArrow onClick={goToCheckout}>
          شرکت در مینی‌دوره
        </Button>
      </div>
    </div>
  );
}
