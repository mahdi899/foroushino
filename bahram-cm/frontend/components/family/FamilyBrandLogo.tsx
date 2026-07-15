import { SiteImage } from '@/components/ui/SiteImage';
import { brandLogoDisplay, sitePhotos } from '@/lib/site-photo-paths';
import { cn } from '@/lib/utils';

type FamilyBrandLogoProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  priority?: boolean;
};

const sizeClass = {
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-20 w-20',
} as const;

/** Circular Bahram logo for family surfaces (login, join, headers). */
export function FamilyBrandLogo({ className, size = 'md', priority = false }: FamilyBrandLogoProps) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.35)] ring-1 ring-gold/30',
        sizeClass[size],
        brandLogoDisplay.containerClass,
        className,
      )}
      aria-hidden
    >
      <SiteImage
        src={sitePhotos.logoBahram}
        alt="لوگوی بهرام رستمی"
        fallbackAlt="لوگوی بهرام رستمی"
        fill
        priority={priority}
        className={brandLogoDisplay.imageClass}
      />
    </div>
  );
}
