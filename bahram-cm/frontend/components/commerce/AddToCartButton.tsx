"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import { buildCartUrl } from "@/lib/cart/url";
import { addToCart } from "@/lib/cart/store.client";
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
    addToCart(productSlug);
    window.location.assign(buildCartUrl(window.location.origin));
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
