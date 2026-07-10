"use client";

import type { ReactNode } from "react";
import { CheckoutDiscountProvider } from "@/lib/discount/context";

export function CheckoutSidebar({ children }: { children: ReactNode }) {
  return <CheckoutDiscountProvider>{children}</CheckoutDiscountProvider>;
}
