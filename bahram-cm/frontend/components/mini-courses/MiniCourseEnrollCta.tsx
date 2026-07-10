'use client';

import { useTransition } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, LinkButton } from '@/components/ui/Button';
import { enrollMiniCourseAction } from '@/lib/student/miniCourseActions';

type MiniCourseEnrollCtaProps = {
  slug: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  enrollmentNumber?: string | null;
};

export function MiniCourseEnrollCta({
  slug,
  isLoggedIn,
  isEnrolled,
  enrollmentNumber,
}: MiniCourseEnrollCtaProps) {
  const [pending, startTransition] = useTransition();
  const loginHref = `/panel/login?redirect=${encodeURIComponent(`/mini-courses/${slug}`)}`;

  if (isEnrolled) {
    return (
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-glow">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          <span>شما در این مینی‌دوره ثبت‌نام کرده‌اید.</span>
        </div>
        {enrollmentNumber ? (
          <p className="text-sm text-bone-dim">
            شماره سفارش:{' '}
            <span className="num-latin font-medium text-bone" dir="ltr">
              {enrollmentNumber}
            </span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <LinkButton href="/panel/courses" variant="primary" size="lg" withArrow>
            مشاهده در دوره‌های من
          </LinkButton>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-bone-dim">
          برای شرکت در این مینی‌دوره رایگان، ابتدا وارد حساب کاربری شوید یا ثبت‌نام کنید.
        </p>
        <div className="flex flex-wrap gap-3">
          <LinkButton href={loginHref} variant="primary" size="lg" withArrow>
            شرکت در مینی‌دوره
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-bone-dim">
        با زدن دکمه زیر، این مینی‌دوره برای شما فعال می‌شود و در بخش «دوره‌های من» پنل نمایش داده
        می‌شود.
      </p>
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
