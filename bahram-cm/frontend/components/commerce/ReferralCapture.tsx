"use client";

import { useEffect } from "react";
import { captureReferralCodeFromUrl } from "@/lib/referral/capture";

/** Captures `?ref=` site-wide so referral links do not need a product-specific URL. */
export function ReferralCapture() {
  useEffect(() => {
    captureReferralCodeFromUrl();
  }, []);

  return null;
}
