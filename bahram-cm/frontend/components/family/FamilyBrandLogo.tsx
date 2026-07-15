import { SiteImage } from '@/components/ui/SiteImage';
import { brandLogoDisplay, sitePhotos } from '@/lib/site-photo-paths';
import { cn } from '@/lib/utils';

type FamilyBrandLogoProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  priority?: boolean;
  hasStoryRing?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
};

const sizeClass = {
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-20 w-20',
  xl: 'h-28 w-28',
} as const;

const storyPaddingClass = {
  sm: 'p-[2px]',
  md: 'p-[2.5px]',
  lg: 'p-[3px]',
  xl: 'p-[3.5px]',
} as const;

/** Circular Bahram logo for family surfaces (login, join, headers). */
export function FamilyBrandLogo({
  className,
  size = 'md',
  priority = false,
  hasStoryRing = false,
  onClick,
  ariaLabel,
}: FamilyBrandLogoProps) {
  const logo = (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.35)] ring-1 ring-gold/30',
        sizeClass[size],
        brandLogoDisplay.containerClass,
        !hasStoryRing && className,
      )}
      aria-hidden={!onClick}
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

  const content = hasStoryRing ? (
    <span
      className={cn(
        'inline-flex rounded-full bg-gradient-to-tr from-gold via-amber-300 to-gold',
        storyPaddingClass[size],
        className,
      )}
    >
      <span className={cn('rounded-full bg-[#0b0f14]', storyPaddingClass[size])}>{logo}</span>
    </span>
  ) : (
    logo
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? 'مشاهده استوری'}
        className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      >
        {content}
      </button>
    );
  }

  return content;
}
