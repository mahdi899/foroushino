import Link from "next/link";
import { DirectMediaImg } from "@/components/ui/DirectMediaImg";
import { brandLogoDisplay, sitePhotos } from "@/lib/site-photo-paths";
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
  /** `footer`: compact on phone, full scale from `md` up */
  size?: "sm" | "md" | "footer";
  showWordmark?: boolean;
}) {
  const markSize =
    size === "sm" ? "h-8 w-8" : size === "footer" ? "h-8 w-8 md:h-9 md:w-9" : "h-9 w-9";

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
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden rounded-full",
          markSize,
          brandLogoDisplay.containerClass,
        )}
        aria-hidden
      >
        <DirectMediaImg
          src={sitePhotos.logoBahram}
          alt=""
          fill
          loading="eager"
          fetchPriority="high"
          className={cn(brandLogoDisplay.imageClass, "transition-transform duration-500 group-hover:scale-[1.03]")}
        />
      </span>
      {showWordmark ? (
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
      ) : null}
    </Link>
  );
}
