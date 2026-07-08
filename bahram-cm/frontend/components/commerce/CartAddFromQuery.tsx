"use client";

import { useEffect } from "react";
import { addToCart } from "@/lib/cart/store.client";

/** Handles `?add=<slug>` on the cart page so deep links can seed the cart. */
export function CartAddFromQuery({ slug }: { slug: string }) {
  useEffect(() => {
    addToCart(slug);
    window.location.replace("/cart");
  }, [slug]);

  return null;
}
