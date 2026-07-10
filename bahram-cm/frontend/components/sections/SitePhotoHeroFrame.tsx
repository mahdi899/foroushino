import type { ReactNode } from "react";
import { SiteImage } from "@/components/ui/SiteImage";
import { cn } from "@/lib/cn";

type Props = {
  desktopSrc: string;
  mobileSrc: string;
  desktopAlt: string;
  mobileAlt?: string;
  desktopImageClassName?: string;
  mobileImageClassName?: string;
  children: ReactNode;
};

/** Full-bleed photo hero — portrait 9:16 on mobile, landscape on md+. */
export function SitePhotoHeroFrame({
  desktopSrc,
  mobileSrc,
  desktopAlt,
  mobileAlt,
  desktopImageClassName,
  mobileImageClassName,
  children,
}: Props) {
  const mobileAltText = mobileAlt ?? desktopAlt;

  return (
    <div
      className={cn(
        "relative aspect-[9/16] w-full max-h-[min(92vh,44rem)]",
        "md:aspect-[16/7.3] md:max-h-[min(66vh,36rem)]",
        "lg:aspect-[16/12.5] lg:max-h-[min(82vh,47rem)]",
      )}
    >
      <div className="absolute inset-0 z-0 overflow-hidden md:hidden">
        <SiteImage
          src={mobileSrc}
          alt={mobileAltText}
          fallbackAlt={mobileAltText}
          fill
          priority
          sizes="(max-width: 767px) 100vw, 0px"
          className={cn("object-cover object-[center_22%]", mobileImageClassName)}
        />
      </div>
      <div className="absolute inset-0 z-0 hidden overflow-hidden md:block">
        <SiteImage
          src={desktopSrc}
          alt={desktopAlt}
          fallbackAlt={desktopAlt}
          fill
          priority
          sizes="(min-width: 768px) 100vw, 0px"
          className={cn("object-cover object-center", desktopImageClassName)}
        />
      </div>
      <div aria-hidden className="photo-scrim-bottom-half" />
      {children}
    </div>
  );
}
