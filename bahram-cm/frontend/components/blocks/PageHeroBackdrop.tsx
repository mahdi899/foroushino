import { SiteImage } from "@/components/ui/SiteImage";

type Props = {
  src: string;
  alt?: string;
  fallbackAlt?: string;
  priority?: boolean;
  sizes?: string;
};

/** Blurred, darkened full-bleed backdrop for inner-page heroes (not homepage). */
export function PageHeroBackdrop({ src, alt, fallbackAlt, priority, sizes }: Props) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <SiteImage
        src={src}
        alt={alt ?? ""}
        fallbackAlt={fallbackAlt}
        fill
        priority={priority}
        sizes={sizes ?? "100vw"}
        wrapperClassName="absolute inset-0 z-0 overflow-hidden"
        className="object-cover blur-lg brightness-50 saturate-75"
      />
      <div aria-hidden className="page-hero-backdrop-scrim" />
    </div>
  );
}
