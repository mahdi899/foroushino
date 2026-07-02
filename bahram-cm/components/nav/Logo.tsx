import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Minimal wordmark. A single gold dot precedes the name, doubling as a
 * "living brand" indicator. No favicon-style box.
 */
export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  /** `footer`: compact on phone, full scale from `md` up */
  size?: "sm" | "md" | "footer";
}) {
  return (
    <Link
      href="/"
      aria-label="بهرام رستمی — صفحه‌ی نخست"
      className={cn(
        "group inline-flex items-center gap-2.5 text-bone",
        className,
      )}
    >
      <span
        aria-hidden
        className="relative inline-flex h-[7px] w-[7px] items-center justify-center"
      >
        <span className="absolute inset-0 rounded-full bg-gold" />
        <span className="absolute inset-0 animate-ping rounded-full bg-gold/40 [animation-duration:3s]" />
      </span>
      <span
        className={cn(
          "font-display font-bold tracking-tight",
          size === "sm"
            ? "text-base"
            : size === "footer"
              ? "text-base md:text-xl"
              : "text-lg md:text-xl",
        )}
      >
        بهرام رستمی
      </span>
    </Link>
  );
}
