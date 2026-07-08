"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import type { ComponentPropsWithoutRef } from "react";

type AddToCartButtonProps = Omit<ComponentPropsWithoutRef<typeof Button>, "onClick"> & {
  productSlug: string;
  location?: string;
};

export function AddToCartButton({
  productSlug,
  location = "course_page",
  disabled,
  ...rest
}: AddToCartButtonProps) {
  const [busy, setBusy] = useState(false);

  function onClick() {
    if (busy || disabled) return;

    setBusy(true);
    track("course_cta_click", { course: productSlug, location });
    window.location.assign(`/api/cart/add?slug=${encodeURIComponent(productSlug)}`);
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    />
  );
}
