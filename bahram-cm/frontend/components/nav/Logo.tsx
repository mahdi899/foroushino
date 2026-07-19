import Link from "next/link";
import { BrandLogoImage } from "@/components/ui/BrandLogoImage";
import { brandLogoDisplay, brandLogoPixelSize } from "@/lib/site-photo-paths";
import { cn } from "@/lib/cn";

/**
 * Wordmark with the official circular brand mark.
 */
export function Logo({
  className,
  size = "md",
  showWordmark = true,
}: {
  className?: string;
  /** `footer`: horizontal on desktop. `footer-mobile`: large stacked mark on phone footer. */
  size?: "sm" | "md" | "footer" | "footer-mobile";
  showWordmark?: boolean;
}) {
  const isFooterMobile = size === "footer-mobile";
  const pixelSize = brandLogoPixelSize(size);

  const markSize =
    size === "sm"
      ? "h-8 w-8"
      : isFooterMobile
        ? "h-40 w-40 sm:h-44 sm:w-44"
        : size === "footer"
          ? "h-9 w-9"
          : "h-9 w-9";

  return (
    <Link
      href="/"
      aria-label="بهرام رستمی — صفحه‌ی نخست"
      className={cn(
        "group inline-flex w-fit max-w-full text-bone",
        isFooterMobile
          ? "flex-col items-center gap-3 text-center"
          : "flex-row flex-nowrap items-center gap-2 md:gap-2.5",
        className,
      )}
    >
      <span
        className={cn(
          "relative block shrink-0 overflow-hidden rounded-full",
          markSize,
          brandLogoDisplay.containerClass,
          isFooterMobile && "ring-2 ring-gold/35 shadow-[0_16px_48px_rgba(201,147,10,0.24)]",
        )}
        aria-hidden
      >
        <BrandLogoImage
          size={pixelSize}
          priority
          className={cn(
            brandLogoDisplay.imageClass,
            "h-full w-full transition-transform duration-500 group-hover:scale-[1.03]",
          )}
        />
      </span>
      {showWordmark ? (
        <span
          className={cn(
            "whitespace-nowrap font-display font-bold tracking-tight",
            size === "sm"
              ? "text-base"
              : isFooterMobile
                ? "text-lg"
                : size === "footer"
                  ? "text-xl"
                  : "text-lg md:text-xl",
          )}
        >
          بهرام رستمی
        </span>
      ) : null}
    </Link>
  );
}
