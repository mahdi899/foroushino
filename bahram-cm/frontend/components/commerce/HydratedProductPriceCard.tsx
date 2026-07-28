'use client';

import {
  useProductPurchaseState,
  type ProductPurchaseState,
} from '@/components/commerce/ProductPurchaseProvider';
import { formatFa, toPersianDigits } from '@/lib/persian';
import { cn } from '@/lib/cn';

type Props = {
  fallback: ProductPurchaseState;
  className?: string;
  cardClassName?: string;
  /** When set, overrides the default discount hint under the price. */
  discountHint?: string | null;
  ribbonLabel?: string | null;
};

export function HydratedProductPriceCard({
  fallback,
  className,
  cardClassName,
  discountHint,
  ribbonLabel,
}: Props) {
  const purchase = useProductPurchaseState(fallback);
  const originalPriceLabel =
    purchase.hasDiscount ? `${formatFa(purchase.listPrice)} تومان` : null;
  const hint =
    discountHint !== undefined
      ? discountHint
      : purchase.seminarOff
        ? 'ویژه شرکت‌کنندگان سمینار'
        : purchase.hasDiscount
          ? null
          : null;
  const ribbon =
    ribbonLabel !== undefined
      ? ribbonLabel
      : purchase.discountPercent
        ? `${toPersianDigits(String(purchase.discountPercent))}٪ تخفیف ویژه`
        : null;

  return (
    <div className={cn(className)}>
      <div className={cn('campaign-course-intro-price', cardClassName)}>
        {ribbon ? (
          <div className="campaign-course-intro-price-ribbon">{ribbon}</div>
        ) : null}

        <div className="campaign-course-intro-price-body">
          {originalPriceLabel ? (
            <p className="campaign-course-intro-was num-latin">{originalPriceLabel}</p>
          ) : null}

          <p className="campaign-course-intro-now">
            <span className="campaign-course-intro-now__amount num-latin">
              {formatFa(purchase.finalPrice)}
            </span>
            <span className="campaign-course-intro-now__unit">تومان</span>
          </p>
          {hint ? <p className="mt-2 text-caption text-emerald">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}
