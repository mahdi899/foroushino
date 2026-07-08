"use client";

import { useCallback, useEffect, useState } from "react";
import { CART_UPDATED_EVENT } from "./events";
import { getCartSlugs } from "./store.client";

export function useCartCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    setCount(getCartSlugs().length);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(CART_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CART_UPDATED_EVENT, refresh);
  }, [refresh]);

  return count;
}
