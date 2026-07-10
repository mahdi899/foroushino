"use client";

import { ProductPurchaseCta } from "@/components/commerce/ProductPurchaseCta";
import { cn } from "@/lib/cn";
import { CAMPAIGN_WRITING_SLUG } from "@/lib/cart/constants";
import { useMobileScrollReveal } from "@/lib/useMobileScrollReveal";

type Props = {
  priceLabel: string;
  alreadyPurchased: boolean;
};

export function MobileStickyEnrollBar({ priceLabel, alreadyPurchased }: Props) {
  const visible = useMobileScrollReveal();

  return (
    <div
      className={cn(
        "mobile-sticky-enroll-bar fixed inset-x-0 z-40 px-4 py-3 transition-transform duration-150 ease-out md:hidden",
        visible ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-start text-right">
          <p className="mobile-sticky-enroll-bar__title text-[11px] font-medium leading-tight">
            دوره کمپین‌نویسی
          </p>
          <p className="mobile-sticky-enroll-bar__price mt-1 text-base font-bold leading-tight num-latin">
            {priceLabel}
          </p>
        </div>
        <ProductPurchaseCta
          productSlug={CAMPAIGN_WRITING_SLUG}
          alreadyPurchased={alreadyPurchased}
          location="campaign_writing_mobile_bar"
          variant="sales"
          size="lg"
          className="h-12 min-h-12 min-w-[10.5rem] shrink-0 px-10 text-base font-bold"
        >
          خرید
        </ProductPurchaseCta>
      </div>
    </div>
  );
}
