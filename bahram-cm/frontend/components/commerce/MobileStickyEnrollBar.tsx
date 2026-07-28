"use client";

import { ProductPurchaseCta } from "@/components/commerce/ProductPurchaseCta";
import { cn } from "@/lib/cn";
import { CAMPAIGN_WRITING_SLUG } from "@/lib/cart/constants";
import { useMobileScrollReveal } from "@/lib/useMobileScrollReveal";

type Props = {
  priceLabel: string;
  alreadyPurchased: boolean;
  productSlug?: string;
  title?: string | null;
  priceHint?: string | null;
  location?: string;
  panelHref?: string;
  ownedLabel?: string;
};

export function MobileStickyEnrollBar({
  priceLabel,
  alreadyPurchased,
  productSlug = CAMPAIGN_WRITING_SLUG,
  title = "دوره کمپین‌نویسی",
  priceHint = null,
  location = "campaign_writing_mobile_bar",
  panelHref,
  ownedLabel,
}: Props) {
  const visible = useMobileScrollReveal();

  return (
    <div
      className={cn(
        "mobile-sticky-enroll-bar fixed inset-x-0 z-40 px-4 py-3 transition-[transform,opacity] duration-150 ease-out md:hidden",
        // When hidden, clear the translucent bottom-nav zone entirely —
        // translate-y-full alone parks the bar behind the nav where it still shows through.
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-[calc(100%+var(--site-bottom-nav-offset))] opacity-0",
      )}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-start text-right">
          {title ? (
            <p className="mobile-sticky-enroll-bar__title text-[11px] font-medium leading-tight">
              {title}
            </p>
          ) : null}
          <p
            className={cn(
              "mobile-sticky-enroll-bar__price text-base font-bold leading-tight num-latin",
              title ? "mt-1" : null,
            )}
          >
            {priceLabel}
          </p>
          {priceHint ? (
            <p className="mobile-sticky-enroll-bar__hint mt-0.5 text-[10px] leading-snug text-emerald">
              {priceHint}
            </p>
          ) : null}
        </div>
        <ProductPurchaseCta
          productSlug={productSlug}
          alreadyPurchased={alreadyPurchased}
          location={location}
          panelHref={panelHref}
          ownedLabel={ownedLabel}
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
