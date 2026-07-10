"use client";

import { useEffect } from "react";
import { captureDiscountCodeFromUrl } from "@/lib/discount/capture";

/** Captures `?discount=` / `?coupon=` site-wide so discount links work on any page. */
export function DiscountCapture() {
  useEffect(() => {
    captureDiscountCodeFromUrl();
  }, []);

  return null;
}
