import { cn } from '@/lib/cn';
import { formatPanelFa } from '@/lib/persian';

export function PanelTomanAmount({
  amount,
  size = 'md',
  struck = false,
  className,
}: {
  amount: number;
  size?: 'sm' | 'md';
  /** Cross out the amount (compare-at / pre-discount price). */
  struck?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-baseline gap-1', className)}>
      <span
        dir="ltr"
        className={cn(
          'panel-amount tabular-nums',
          struck
            ? 'font-medium text-text-muted line-through opacity-70'
            : 'font-bold text-text',
          size === 'sm' ? 'text-sm' : 'text-xl sm:text-2xl',
        )}
      >
        {formatPanelFa(amount)}
      </span>
      <span
        className={cn(
          struck
            ? 'font-normal text-text-muted line-through opacity-70'
            : 'font-normal text-text-muted',
          size === 'sm' ? 'panel-text-caption' : 'panel-text-meta',
        )}
      >
        تومان
      </span>
    </span>
  );
}
