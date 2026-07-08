"use client";

import { useEffect, useRef } from "react";
import { clearCart, removeFromCart } from "@/lib/cart/store.client";

type Props = {
  productSlug?: string | null;
};

/** Removes purchased product from cart cookie after successful checkout. */
export function ClearCartOnPurchase({ productSlug }: Props) {
  const cleared = useRef(false);

  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;

    if (productSlug) {
      removeFromCart(productSlug);
      return;
    }

    clearCart();
  }, [productSlug]);

  return null;
}
