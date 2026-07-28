'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { ProductDetail } from '@/lib/services/products';

export type ProductPurchaseState = {
  alreadyPurchased: boolean;
  listPrice: number;
  finalPrice: number;
  hasDiscount: boolean;
  discountPercent: number | null;
  seminarOff?: boolean;
};

const ProductPurchaseContext = createContext<ProductPurchaseState | null>(null);

export function ProductPurchaseProvider({
  productSlug,
  initial,
  children,
}: {
  productSlug: string;
  initial: ProductPurchaseState;
  children: ReactNode;
}) {
  const [state, setState] = useState<ProductPurchaseState>(initial);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    void (async () => {
      try {
        const res = await fetch(`/api/student/products/${encodeURIComponent(productSlug)}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { data?: ProductDetail };
        const product = json.data;
        if (!product || cancelled) return;

        const pricing = product.reference_pricing;
        const listPrice = pricing?.amount ?? product.price;
        const finalPrice = pricing?.final_amount ?? product.effective_price;
        const hasDiscount = finalPrice < listPrice;
        const discountPercent = hasDiscount
          ? Math.round(((listPrice - finalPrice) / listPrice) * 100)
          : null;

        setState({
          alreadyPurchased: product.already_purchased ?? false,
          listPrice,
          finalPrice,
          hasDiscount,
          discountPercent,
          seminarOff: Boolean(pricing?.seminar_off),
        });
      } catch {
        // Keep ISR guest pricing / CTA.
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [productSlug]);

  return (
    <ProductPurchaseContext.Provider value={state}>{children}</ProductPurchaseContext.Provider>
  );
}

export function useProductPurchaseState(fallback: ProductPurchaseState): ProductPurchaseState {
  return useContext(ProductPurchaseContext) ?? fallback;
}
