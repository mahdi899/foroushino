'use client';

import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useStudentAuthOptional } from '@/components/student-panel/auth/StudentAuthContext';
import { formatFa } from '@/lib/persian';
import { cn } from '@/lib/cn';

type SeminarRegisterCtaProps = {
  productSlug: string | null;
  isPurchasable: boolean;
  isFull: boolean;
  isLoggedIn: boolean;
  price: number | null;
  salePrice: number | null;
  effectivePrice: number | null;
  remainingSeats: number | null;
};

export function SeminarRegisterCta({
  productSlug,
  isPurchasable,
  isFull,
  isLoggedIn,
  price,
  salePrice,
  effectivePrice,
  remainingSeats,
}: SeminarRegisterCtaProps) {
  const router = useRouter();
  const auth = useStudentAuthOptional();
  const [pending, setPending] = useState(false);

  const hasDiscount =
    price != null && salePrice != null && effectivePrice != null && effectivePrice < price;

  function onRegister() {
    if (!productSlug || isFull || !isPurchasable) return;

    const purchaseUrl = `/purchase/${productSlug}`;

    if (isLoggedIn) {
      setPending(true);
      router.push(purchaseUrl);
      return;
    }

    if (auth?.openLogin) {
      auth.openLogin({ redirectTo: purchaseUrl });
      return;
    }

    router.push(`/panel/login?redirect=${encodeURIComponent(purchaseUrl)}`);
  }

  const shellClassName =
    'sticky top-[calc(3.5rem+100px)] z-10 w-full self-start md:top-[calc(4rem+100px)]';

  const cardClassName =
    'neon-surface-static rounded-card border border-bone/10 bg-charcoal/45 p-4 sm:rounded-card-lg sm:p-6 md:p-8';

  if (!isPurchasable) {
    return (
      <div className={shellClassName}>
        <div className={cn(cardClassName, 'text-sm text-bone-dim sm:text-base')}>
          ثبت‌نام آنلاین برای این سمینار فعال نیست.
        </div>
      </div>
    );
  }

  return (
    <div className={shellClassName}>
      <div className={cardClassName}>
        <p className="text-xs text-mist sm:text-caption">هزینه شرکت در سمینار</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:mt-3 sm:gap-3">
          <span className="text-[1.375rem] font-semibold leading-none text-bone num-latin sm:text-h3 md:text-h2">
            {formatFa(effectivePrice ?? price ?? 0)}
          </span>
          <span className="text-xs text-mist sm:text-caption">تومان</span>
          {hasDiscount ? (
            <span className="text-xs text-mist line-through num-latin sm:text-caption">{formatFa(price!)}</span>
          ) : null}
        </div>

        {remainingSeats != null ? (
          <p className="mt-2 text-xs leading-relaxed text-bone-dim sm:mt-3 sm:text-sm">
            {isFull
              ? 'ظرفیت این سمینار تکمیل شده است.'
              : `${formatFa(remainingSeats)} جای خالی باقی مانده`}
          </p>
        ) : null}

        {isFull ? (
          <div className="mt-4 rounded-tile border border-gold/30 bg-gold/8 px-3 py-2.5 text-xs text-gold sm:mt-6 sm:px-4 sm:py-3 sm:text-sm">
            ظرفیت سمینار تکمیل شده و امکان ثبت‌نام وجود ندارد.
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onRegister}
              disabled={pending}
              className={cn(
                'neon-btn-primary mt-4 inline-flex h-11 min-h-11 w-full items-center justify-center gap-2 rounded-pill bg-emerald px-5 text-sm font-semibold transition-[background-color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] hover:bg-emerald-glow hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/50 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-6 sm:h-12 sm:min-h-12 sm:px-7 sm:text-base',
              )}
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  در حال انتقال…
                </>
              ) : isLoggedIn ? (
                'ادامه ثبت‌نام و پرداخت'
              ) : (
                'ورود و ثبت‌نام'
              )}
            </button>
            {!isLoggedIn ? (
              <p className="mt-2.5 text-center text-xs leading-relaxed text-mist sm:mt-3 sm:text-caption">
                برای ادامه، ابتدا با شماره موبایل خود وارد می‌شوید.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
