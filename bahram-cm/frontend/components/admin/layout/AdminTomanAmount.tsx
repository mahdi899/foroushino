import { cn } from '@/lib/utils';
import { formatPanelFa } from '@/lib/persian';

export function AdminTomanAmount({
  amount,
  size = 'md',
  className,
  amountClassName,
}: {
  amount: number;
  size?: 'sm' | 'md';
  className?: string;
  amountClassName?: string;
}) {
  return (
    <span className={cn('inline-flex items-baseline gap-1', className)}>
      <span
        dir="ltr"
        className={cn(
          'admin-amount font-semibold tabular-nums text-text',
          size === 'sm' ? 'text-caption' : 'text-small',
          amountClassName,
        )}
      >
        {formatPanelFa(amount)}
      </span>
      <span className={cn('font-normal text-text-muted', size === 'sm' ? 'admin-text-meta' : 'admin-text-caption')}>
        تومان
      </span>
    </span>
  );
}
