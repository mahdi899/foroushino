import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { liveIconArrow } from "@/lib/iconMotion";

type Variant = "primary" | "ghost" | "gold-link" | "vip";
type Size = "sm" | "md" | "lg";

type BaseProps = {
  variant?: Variant;
  size?: Size;
  withArrow?: boolean;
  children: ReactNode;
  className?: string;
};

const base =
  "group inline-flex items-center justify-center gap-2 font-medium select-none whitespace-nowrap transition-[background,color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] focus-visible:outline-none";

const variantStyles: Record<Variant, string> = {
  primary:
    "neon-btn-primary rounded-pill bg-emerald hover:bg-emerald-glow hover:-translate-y-px active:translate-y-0",
  ghost:
    "neon-btn-ghost rounded-pill border border-bone/15 text-bone hover:border-bone/35 hover:bg-bone/[0.03]",
  "gold-link":
    "text-gold hover:text-gold-soft underline-offset-8 hover:underline decoration-gold/40",
  vip:
    "neon-btn-primary rounded-pill bg-gold font-semibold text-neutral-950 shadow-gold hover:bg-gold-soft hover:text-neutral-950 hover:-translate-y-px active:translate-y-0",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-9 min-h-9 px-4 text-[0.8125rem] gap-1.5",
  md: "h-11 min-h-11 px-5 text-[0.95rem]",
  lg: "h-14 min-h-14 px-7 text-base",
};

function arrowClasses(size: Size) {
  if (size === "sm") return liveIconArrow("rtl-flip h-3.5 w-3.5");
  return liveIconArrow("rtl-flip h-4 w-4");
}

type LinkButtonProps = BaseProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children">;

export function LinkButton({
  variant = "primary",
  size = "md",
  withArrow = false,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      {...(variant === "vip" ? { "data-neon-tone": "gold" } : {})}
      className={cn(
        base,
        variant !== "gold-link" && sizeStyles[size],
        variantStyles[variant],
        className,
      )}
      {...rest}
    >
      {children}
      {withArrow && (
        <ArrowLeft className={arrowClasses(size)} aria-hidden />
      )}
    </Link>
  );
}

type ButtonProps = BaseProps & ComponentPropsWithoutRef<"button">;

export function Button({
  variant = "primary",
  size = "md",
  withArrow = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...(variant === "vip" ? { "data-neon-tone": "gold" } : {})}
      className={cn(
        base,
        variant !== "gold-link" && sizeStyles[size],
        variantStyles[variant],
        className,
      )}
      {...rest}
    >
      {children}
      {withArrow && (
        <ArrowLeft className={arrowClasses(size)} aria-hidden />
      )}
    </button>
  );
}
