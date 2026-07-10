'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Button, LinkButton } from '@/components/ui/Button';
import { miniCoursePurchasePath } from '@/lib/mini-courses/purchase';

type MiniCourseEnrollCtaProps = {
  slug: string;
  isEnrolled: boolean;
  enrollmentNumber?: string | null;
  variant?: 'default' | 'hero' | 'overlay';
};

export function MiniCourseEnrollCta({
  slug,
  isEnrolled,
  enrollmentNumber,
  variant = 'default',
}: MiniCourseEnrollCtaProps) {
  const router = useRouter();
  const purchasePath = miniCoursePurchasePath(slug);
  const isOverlay = variant === 'overlay';
  const isHero = variant === 'hero' || isOverlay;

  const goToCheckout = () => {
    router.push(purchasePath);
  };

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
