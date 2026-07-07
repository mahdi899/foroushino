import type { ReactNode } from "react";
import { ImageIcon } from "lucide-react";
import { AppImage } from "@/components/ui/AppImage";
import { primarySiteImageSrc } from "@/lib/mediaUrl";
import { cn } from "@/lib/cn";

type Variant = "radial" | "grid" | "soft" | "outline";
type Ratio = "portrait" | "square" | "landscape" | "ultrawide" | "story";

const ratioClass: Record<Ratio, string> = {
  portrait: "aspect-[4/5]",
  square: "aspect-square",
  landscape: "aspect-[16/10]",
  ultrawide: "aspect-[21/9]",
  story: "aspect-[9/16]",
};

const variantClass: Record<Variant, string> = {
  radial: "placeholder-radial",
  grid: "placeholder-grid bg-obsidian/70",
  soft: "bg-gradient-to-br from-charcoal/85 via-obsidian to-ink",
  outline: "bg-charcoal/40",
};

type Props = {
  ratio?: Ratio;
  variant?: Variant;
  label?: string;
  hint?: string;
  badge?: string;
  rounded?: "card" | "card-lg" | "frame" | "tile" | "none";
  className?: string;
  children?: ReactNode;
  showIcon?: boolean;
  /** Gallery storage path — e.g. `/storage/media/site/hero.jpg` */
  src?: string;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  /** وقتی عکس هست: زیرنویس پایین، وسط، یا بدون متن روی عکس */
  photoCaption?: "bottom" | "center" | "none";
  /** کلاس اضافه برای پاراگراف hint (مثلاً `max-md:hidden`) */
  hintClassName?: string;
  /** کلاس اضافه برای برچسب نام روی عکس */
  labelClassName?: string;
  /** هاور: زوم تصویر، glow قاب، lift */
  interactive?: boolean;
  /** حاشیه نئون — gold / emerald */
  neonTone?: "gold" | "emerald";
};

/**
 * قاب عکس: حالت بدون `src` پلیس‌هولدر لوکس است؛ با `src` همان قاب روی عکس واقعی.
 */
export function PhotoFrame({
  ratio = "portrait",
  variant = "radial",
  label,
  hint,
  badge,
  rounded = "frame",
  className,
  children,
  showIcon = true,
  src,
  alt,
  sizes,
  priority,
  photoCaption = "bottom",
  hintClassName,
  labelClassName,
  interactive = false,
  neonTone,
}: Props) {
  const roundedClass =
    rounded === "card-lg"
      ? "rounded-card-lg"
      : rounded === "card"
        ? "rounded-card"
        : rounded === "tile"
          ? "rounded-tile"
          : rounded === "frame"
            ? "rounded-frame"
            : "";

  const hasImage = Boolean(src);
  const displayIcon = hasImage ? false : showIcon;
  const aria = alt ?? label ?? "تصویر";
  const imageSrc = hasImage ? primarySiteImageSrc(src) || src! : undefined;
  const defaultSizes =
    ratio === "landscape"
      ? "(max-width: 768px) 100vw, 560px"
      : ratio === "story"
        ? "(max-width: 768px) 72vw, 300px"
        : ratio === "square"
          ? "(max-width: 768px) 45vw, 200px"
          : "(max-width: 768px) 90vw, 420px";

  return (
    <div
      {...(neonTone ? { "data-neon-tone": neonTone } : {})}
      className={cn(
        "group relative overflow-hidden border shadow-frame",
        neonTone === "gold" ? "border-gold/30" : "border-bone/10",
        ratioClass[ratio],
        !hasImage && variantClass[variant],
        hasImage && "bg-ink",
        roundedClass,
        neonTone && "hero-photo-neon neon-surface-framed",
        interactive &&
          "transition-[transform,box-shadow,border-color] duration-500 ease-[var(--ease-luxe)] hover:-translate-y-1.5",
        interactive &&
          neonTone === "gold" &&
          "hover:border-gold/55 hover:shadow-[0_24px_56px_-24px_rgba(5,10,11,0.55),0_0_40px_-8px_color-mix(in_oklab,var(--color-gold)_34%,transparent)]",
        interactive &&
          neonTone !== "gold" &&
          "hover:border-emerald-glow/40 hover:shadow-[0_24px_56px_-24px_rgba(5,10,11,0.55),0_0_36px_-10px_color-mix(in_oklab,var(--color-emerald-glow)_30%,transparent)]",
        className,
      )}
      role="img"
      aria-label={aria}
    >
      {hasImage ? (
        <>
          <AppImage
            src={imageSrc!}
            alt={aria}
            fill
            priority={priority}
            sizes={sizes ?? defaultSizes}
            className={cn(
              "object-cover transition-transform duration-700 ease-[var(--ease-luxe)] will-change-transform",
              interactive && "group-hover:scale-[1.08]",
            )}
          />
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(80%_80%_at_50%_85%,rgba(0,0,0,0.65)_0%,transparent_55%),linear-gradient(180deg,rgba(0,0,0,0.2)_0%,transparent_40%)]",
              interactive && "transition-opacity duration-500 group-hover:opacity-60",
            )}
          />
          {interactive ? (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-500 group-hover:opacity-100",
                neonTone === "gold"
                  ? "bg-[radial-gradient(80%_60%_at_50%_20%,color-mix(in_oklab,var(--color-gold)_20%,transparent),transparent_70%)]"
                  : "bg-[radial-gradient(80%_60%_at_50%_20%,color-mix(in_oklab,var(--color-emerald-glow)_22%,transparent),transparent_70%)]",
              )}
            />
          ) : null}
        </>
      ) : (
        <>
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.045] mix-blend-overlay"
            preserveAspectRatio="none"
            viewBox="0 0 400 400"
          >
            <defs>
              <pattern id="ph-stripes" patternUnits="userSpaceOnUse" width="22" height="22" patternTransform="rotate(35)">
                <line x1="0" y1="0" x2="0" y2="22" stroke="currentColor" strokeWidth="1.2" />
              </pattern>
            </defs>
            <rect width="400" height="400" fill="url(#ph-stripes)" />
          </svg>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_50%,transparent_30%,rgba(0,0,0,0.35)_100%)]"
          />
        </>
      )}

      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute start-3 top-3 z-[3] h-5 w-5 border-s border-t border-gold/35",
          interactive && (neonTone === "gold" ? "group-hover:border-gold/70" : "group-hover:border-emerald-glow/55"),
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute end-3 top-3 z-[3] h-5 w-5 border-e border-t border-gold/35",
          interactive && (neonTone === "gold" ? "group-hover:border-gold/70" : "group-hover:border-emerald-glow/55"),
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute start-3 bottom-3 z-[3] h-5 w-5 border-s border-b border-gold/35",
          interactive && (neonTone === "gold" ? "group-hover:border-gold/70" : "group-hover:border-emerald-glow/55"),
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute end-3 bottom-3 z-[3] h-5 w-5 border-e border-b border-gold/35",
          interactive && (neonTone === "gold" ? "group-hover:border-gold/70" : "group-hover:border-emerald-glow/55"),
        )}
      />

      {badge ? (
        <span className="absolute end-4 top-4 z-[4] inline-flex items-center gap-2 rounded-pill border border-bone/15 bg-ink/60 px-3 py-1 text-caption text-bone-dim backdrop-blur">
          {badge}
        </span>
      ) : null}

      {!(hasImage && photoCaption === "none") ? (
        <div
          className={cn(
            "relative z-[2] flex h-full w-full flex-col",
            hasImage && photoCaption === "bottom" && "justify-end",
            hasImage && photoCaption === "center" && "items-center justify-center",
            !hasImage && "items-center justify-center p-6 text-center",
            hasImage && photoCaption === "bottom" && "p-3 text-start md:p-5",
            hasImage && photoCaption === "center" && "p-6 text-center",
          )}
        >
          {displayIcon ? (
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-pill border border-bone/15 bg-ink/50 text-bone-dim backdrop-blur">
              <ImageIcon className="h-5 w-5" strokeWidth={1.4} aria-hidden />
            </span>
          ) : null}
          {label ? (
            <p
              className={cn(
                "text-caption uppercase tracking-[0.28em]",
                hasImage ? "text-gold drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)]" : "text-gold",
                labelClassName,
              )}
            >
              {label}
            </p>
          ) : null}
          {hint ? (
            <p
              className={cn(
                "mt-2 max-w-[18ch]",
                hasImage ? "text-sm text-bone/95 drop-shadow-md" : "text-bone-dim",
                hintClassName,
              )}
            >
              {hint}
            </p>
          ) : null}
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
