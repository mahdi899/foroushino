import { cn } from '@/lib/cn';
import { formatPanelFa } from '@/lib/persian';

export function PanelTomanAmount({
  amount,
  size = 'md',
  className,
}: {
  amount: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-baseline gap-1', className)}>
      <span
        dir="ltr"
        className={cn(
          'panel-amount font-bold text-text tabular-nums',
          size === 'sm' ? 'text-sm' : 'text-xl sm:text-2xl',
        )}
      >
        {formatPanelFa(amount)}
      </span>
      <span
        className={cn(
          'font-normal text-text-muted',
          size === 'sm' ? 'text-[10px]' : 'text-[11px]',
        )}
      >
        تومان
      </span>
    </span>
  );
}
