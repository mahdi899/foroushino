import { DirectMediaImg } from '@/components/ui/DirectMediaImg';
import { founderPortraitBrandDisplay, sitePhotos } from '@/lib/site-photo-paths';
import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-border',
        founderPortraitBrandDisplay.containerClass,
        className,
      )}
      aria-hidden
    >
      <DirectMediaImg
        src={sitePhotos.founderAsidePortrait}
        alt=""
        fill
        loading="eager"
        fetchPriority="high"
        className={founderPortraitBrandDisplay.imageClass}
      />
    </div>
  );
}
