import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald font-extrabold text-bone',
        className,
      )}
      aria-hidden
    >
      ب
    </div>
  );
}
