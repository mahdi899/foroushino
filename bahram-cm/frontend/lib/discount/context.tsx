"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { DiscountPreview } from "@/lib/discount/validate";

type CheckoutDiscountContextValue = {
  preview: DiscountPreview | null;
  setPreview: (preview: DiscountPreview | null) => void;
  clearPreview: () => void;
};

const CheckoutDiscountContext = createContext<CheckoutDiscountContextValue | null>(null);

export function CheckoutDiscountProvider({ children }: { children: ReactNode }) {
  const [preview, setPreviewState] = useState<DiscountPreview | null>(null);

  const setPreview = useCallback((next: DiscountPreview | null) => {
    setPreviewState(next);
  }, []);

  const clearPreview = useCallback(() => {
    setPreviewState(null);
  }, []);

  const value = useMemo(
    () => ({
      preview,
      setPreview,
      clearPreview,
    }),
    [preview, setPreview, clearPreview],
  );

  return <CheckoutDiscountContext.Provider value={value}>{children}</CheckoutDiscountContext.Provider>;
}

export function useCheckoutDiscount(): CheckoutDiscountContextValue {
  const ctx = useContext(CheckoutDiscountContext);
  if (!ctx) {
    throw new Error("useCheckoutDiscount must be used within CheckoutDiscountProvider");
  }
  return ctx;
}

export function useCheckoutDiscountOptional(): CheckoutDiscountContextValue | null {
  return useContext(CheckoutDiscountContext);
}
