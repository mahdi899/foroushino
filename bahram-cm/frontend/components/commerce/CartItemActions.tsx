"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LinkButton } from "@/components/ui/Button";
import { removeFromCart } from "@/lib/cart/store.client";

export function CartRemoveButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function onRemove() {
    if (busy) return;
    setBusy(true);
    removeFromCart(slug);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onRemove}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-caption text-mist transition-colors hover:text-gold disabled:opacity-60"
      aria-label="حذف از سبد خرید"
    >
      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
      حذف
    </button>
  );
}

export function CartCheckoutButton({ slug }: { slug: string }) {
  return (
    <LinkButton href={`/purchase/${slug}`} variant="primary" size="lg" withArrow className="w-full">
      ادامه و پرداخت
    </LinkButton>
  );
}
