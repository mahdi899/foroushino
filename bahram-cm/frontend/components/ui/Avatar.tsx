import { AppImage } from "@/components/ui/AppImage";
import { cn } from "@/lib/cn";

export function Avatar({
  src,
  alt,
  size = 56,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-pill ring-1 ring-bone/10",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <AppImage
        src={src}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-cover object-center"
      />
    </span>
  );
}
