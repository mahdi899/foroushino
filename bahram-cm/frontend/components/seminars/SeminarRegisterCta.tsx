"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { formatFa } from "@/lib/persian";
import { cn } from "@/lib/cn";

type SeminarRegisterCtaProps = {
  productSlug: string | null;
  isPurchasable: boolean;
  isFull: boolean;
  price: number | null;
  salePrice: number | null;
  effectivePrice: number | null;
  remainingSeats: number | null;
  alreadyPurchased?: boolean;
  variant?: "card" | "hero" | "intro";
};

export function SeminarRegisterCta({
  productSlug,
  isPurchasable,
  isFull,
  price,
  salePrice,
  effectivePrice,
  remainingSeats,
  alreadyPurchased = false,
  variant = "card",
}: SeminarRegisterCtaProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const hasDiscount =
    price != null && salePrice != null && effectivePrice != null && effectivePrice < price;

  function onRegister() {
    if (!productSlug || isFull || !isPurchasable || pending || alreadyPurchased) return;
    setPending(true);
    router.push(`/purchase/${productSlug}`);
  }

  if (alreadyPurchased) {
    const panelLink = (
      <Link
        href="/panel"
        className={cn(
          variant === "hero" || variant === "intro"
            ? "neon-btn-primary neon-btn-vip inline-flex h-12 min-h-12 w-full items-center justify-center rounded-pill px-8 text-base font-bold shadow-gold md:h-14 md:min-h-14 md:px-10 md:text-lg"
            : "neon-btn-primary mt-4 inline-flex h-11 min-h-11 w-full items-center justify-center rounded-pill bg-emerald px-5 text-sm font-semibold hover:bg-emerald-glow sm:mt-6 sm:h-12 sm:min-h-12 sm:px-7 sm:text-base",
        )}
      >
        مشاهده در پنل
      </Link>
    );

    if (variant === "hero" || variant === "intro") {
      return (
        <div className={cn("flex w-full flex-col items-center gap-3", variant === "intro" && "sm:items-stretch")}>
          <p className={cn("text-center text-sm sm:text-base", variant === "hero" ? "text-white/85" : "text-bone-dim")}>
            شما قبلاً در این سمینار ثبت‌نام کرده‌اید.
          </p>
          {panelLink}
        </div>
      );
    }

    return (
      <div className="neon-surface-static rounded-card border border-bone/10 bg-charcoal/45 p-4 sm:rounded-card-lg sm:p-6 md:p-8">
        <p className="text-sm text-bone-dim sm:text-base">شما قبلاً در این سمینار ثبت‌نام کرده‌اید.</p>
        {panelLink}
      </div>
    );
  }

  if (!isPurchasable) {
    if (variant === "hero") {
      return (
        <p className="max-w-md text-center text-sm text-white/80 sm:text-base">
          ثبت‌نام آنلاین برای این سمینار فعال نیست.
        </p>
      );
    }

    return (
      <div className="text-sm text-bone-dim sm:text-base">
        ثبت‌نام آنلاین برای این سمینار فعال نیست.
      </div>
    );
  }

  if (variant === "intro") {
    if (isFull) {
      return (
        <div className="w-full rounded-pill border border-gold/30 bg-gold/8 px-5 py-3 text-center text-sm text-gold">
          ظرفیت سمینار تکمیل شده است.
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={onRegister}
        disabled={pending}
        className={cn(
          "neon-btn-primary neon-btn-vip inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-pill px-8 text-base font-bold shadow-gold transition-[background-color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:cursor-not-allowed disabled:opacity-60 md:h-14 md:min-h-14 md:px-10 md:text-lg",
        )}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            در حال انتقال…
          </>
        ) : (
          "ثبت‌نام و خرید"
        )}
      </button>
    );
  }

  if (variant === "hero") {
    return (
      <div className="flex w-full max-w-lg flex-col items-center gap-3 sm:max-w-xl md:max-w-2xl">
        <div className="text-center">
          <p className="text-xs text-white/70 sm:text-sm">هزینه شرکت در سمینار</p>
          <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
            <span className="text-2xl font-semibold text-white num-latin sm:text-3xl md:text-4xl">
              {formatFa(effectivePrice ?? price ?? 0)}
            </span>
            <span className="text-sm text-white/75">تومان</span>
            {hasDiscount ? (
              <span className="text-sm text-white/55 line-through num-latin">{formatFa(price!)}</span>
            ) : null}
          </div>
          {remainingSeats != null ? (
            <p className="mt-2 text-xs text-white/70 sm:text-sm">
              {isFull
                ? "ظرفیت این سمینار تکمیل شده است."
                : `${formatFa(remainingSeats)} جای خالی باقی مانده`}
            </p>
          ) : null}
        </div>

        {isFull ? (
          <div className="w-full max-w-xs rounded-pill border border-gold/40 bg-gold/15 px-5 py-3 text-center text-sm text-gold">
            ظرفیت سمینار تکمیل شده است.
          </div>
        ) : (
          <button
            type="button"
            onClick={onRegister}
            disabled={pending}
            className={cn(
              "neon-btn-primary neon-btn-vip inline-flex h-12 min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-pill px-8 text-base font-bold shadow-gold transition-[background-color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:cursor-not-allowed disabled:opacity-60 md:h-14 md:min-h-14 md:px-10 md:text-lg",
            )}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                در حال انتقال…
              </>
            ) : (
              "ثبت‌نام و خرید"
            )}
          </button>
        )}
      </div>
    );
  }

  const cardClassName =
    "neon-surface-static rounded-card border border-bone/10 bg-charcoal/45 p-4 sm:rounded-card-lg sm:p-6 md:p-8";

  return (
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
            ? "ظرفیت این سمینار تکمیل شده است."
            : `${formatFa(remainingSeats)} جای خالی باقی مانده`}
        </p>
      ) : null}

      {isFull ? (
        <div className="mt-4 rounded-tile border border-gold/30 bg-gold/8 px-3 py-2.5 text-xs text-gold sm:mt-6 sm:px-4 sm:py-3 sm:text-sm">
          ظرفیت سمینار تکمیل شده و امکان ثبت‌نام وجود ندارد.
        </div>
      ) : (
        <button
          type="button"
          onClick={onRegister}
          disabled={pending}
          className={cn(
            "neon-btn-primary mt-4 inline-flex h-11 min-h-11 w-full items-center justify-center gap-2 rounded-pill bg-emerald px-5 text-sm font-semibold transition-[background-color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] hover:bg-emerald-glow hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/50 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-6 sm:h-12 sm:min-h-12 sm:px-7 sm:text-base",
          )}
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              در حال انتقال…
            </>
          ) : (
            "ثبت‌نام و خرید"
          )}
        </button>
      )}
    </div>
  );
}
