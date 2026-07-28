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
};

export function HydratedProductPriceCard({ fallback, className, cardClassName }: Props) {
  const purchase = useProductPurchaseState(fallback);
  const originalPriceLabel =
    purchase.hasDiscount ? `${formatFa(purchase.listPrice)} تومان` : null;

  return (
    <div className={cn(className)}>
      <div className={cn('campaign-course-intro-price', cardClassName)}>
        {purchase.discountPercent ? (
          <div className="campaign-course-intro-price-ribbon">
            {toPersianDigits(String(purchase.discountPercent))}٪ تخفیف ویژه
          </div>
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
          {purchase.hasDiscount ? (
            <p className="mt-2 text-caption text-emerald">ویژه شرکت‌کنندگان سمینار</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
