"use client";

import { formatFa } from "@/lib/persian";
import { useCheckoutDiscountOptional } from "@/lib/discount/context";

type ProductLine = {
  slug: string;
  title: string;
  price: number;
  effective_price: number;
};

type Props = {
  products: ProductLine[];
};

function productHasSaleDiscount(product: ProductLine): boolean {
  return product.effective_price < product.price;
}

export function CheckoutPriceSummary({ products }: Props) {
  const discountCtx = useCheckoutDiscountOptional();
  const preview = discountCtx?.preview;

  const originalTotal = products.reduce((sum, product) => sum + product.price, 0);
  const saleTotal = products.reduce((sum, product) => sum + product.effective_price, 0);
  const saleDiscount = Math.max(0, originalTotal - saleTotal);

  const isSingleProduct = products.length === 1;
  const couponDiscount = isSingleProduct && preview ? preview.coupon_discount : 0;
  const grandTotal = Math.max(saleTotal - couponDiscount, 0);
  const totalDiscount = saleDiscount + couponDiscount;

  return (
    <>
      <ul className="mt-5 space-y-3 border-b border-bone/10 pb-5">
        {products.map((product) => {
          const discounted = productHasSaleDiscount(product);
          return (
            <li key={product.slug} className="flex w-full min-w-0 items-start justify-between gap-4 text-sm">
              <span className="min-w-0 flex-1 leading-relaxed text-bone-dim">{product.title}</span>
              <span className="shrink-0 text-end whitespace-nowrap">
                <span className="block text-bone num-latin">{formatFa(product.effective_price)}</span>
                {discounted ? (
                  <span className="mt-0.5 block text-caption text-mist line-through num-latin">
                    {formatFa(product.price)}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      {totalDiscount > 0 ? (
        <div className="mt-5 space-y-2 border-b border-bone/10 pb-5 text-sm">
          {saleDiscount > 0 ? (
            <>
              <div className="flex items-center justify-between gap-4 text-bone-dim">
                <span>قیمت اصلی</span>
                <span className="num-latin line-through">{formatFa(originalTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-gold">
                <span>تخفیف محصول</span>
                <span className="num-latin">−{formatFa(saleDiscount)}</span>
              </div>
            </>
          ) : null}
          {couponDiscount > 0 ? (
            <div className="flex items-center justify-between gap-4 text-emerald-glow">
              <span>کد تخفیف{preview?.code ? ` (${preview.code})` : ""}</span>
              <span className="num-latin">−{formatFa(couponDiscount)}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex w-full min-w-0 items-center justify-between gap-4">
        <span className="shrink-0 text-bone">جمع کل</span>
        <div className="text-end">
          <span className="text-h2 text-bone num-latin">{formatFa(grandTotal)}</span>
          <span className="ms-2 text-caption text-mist">تومان</span>
        </div>
      </div>

      {!isSingleProduct && preview ? (
        <p className="mt-2 text-xs text-mist">
          کد تخفیف هنگام پرداخت هر محصول جداگانه اعمال می‌شود.
        </p>
      ) : null}
    </>
  );
}
