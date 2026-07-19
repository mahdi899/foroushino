import { BrandLogoImage } from '@/components/ui/BrandLogoImage';
import { brandLogoDisplay } from '@/lib/site-photo-paths';
import { cn } from '@/lib/utils';

const BRAND_MARK_PX = 40;

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
      <BrandLogoImage
        size={BRAND_MARK_PX}
        priority
        className={cn(brandLogoDisplay.imageClass, 'h-full w-full')}
      />
    </div>
  );
}
