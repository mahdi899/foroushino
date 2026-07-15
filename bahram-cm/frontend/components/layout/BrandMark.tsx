import { DirectMediaImg } from '@/components/ui/DirectMediaImg';
import { brandLogoDisplay, sitePhotos } from '@/lib/site-photo-paths';
import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative h-10 w-10 shrink-0 overflow-hidden rounded-full',
        brandLogoDisplay.containerClass,
        className,
      )}
      aria-hidden
    >
      <DirectMediaImg
        src={sitePhotos.logoBahram}
        alt=""
        fill
        loading="eager"
        fetchPriority="high"
        className={brandLogoDisplay.imageClass}
      />
    </div>
  );
}
