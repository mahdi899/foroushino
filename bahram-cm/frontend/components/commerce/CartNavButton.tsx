"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { CART_UPDATED_EVENT } from "@/lib/cart/events";
import { useCartCount } from "@/lib/cart/useCartCount";

const iconButtonClass =
  "relative inline-flex h-10 w-10 items-center justify-center rounded-pill border border-bone/10 text-bone transition-colors hover:border-bone/30 hover:text-emerald-glow";

type CartNavButtonProps = {
  className?: string;
  showLabel?: boolean;
  onNavigate?: () => void;
};

export function CartNavButton({ className, showLabel = false, onNavigate }: CartNavButtonProps) {
  const pathname = usePathname();
  const count = useCartCount();

  useEffect(() => {
    // Re-read cookie after navigation (e.g. returning from /api/cart/add).
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  }, [pathname]);

  return (
    <Link
      href="/cart"
      onClick={onNavigate}
      aria-label={count > 0 ? `سبد خرید، ${count} محصول` : "سبد خرید"}
      className={cn(iconButtonClass, showLabel && "h-auto w-auto gap-2 px-3", className)}
    >
      <ShoppingBag className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} aria-hidden />
      {showLabel ? <span className="text-sm font-medium">سبد خرید</span> : null}
      {count > 0 ? (
        <span className="absolute -top-1 -start-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-emerald px-1 text-[0.625rem] font-semibold leading-none text-bone num-latin">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
