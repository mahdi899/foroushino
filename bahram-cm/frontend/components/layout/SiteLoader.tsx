'use client';

import { cn } from '@/lib/cn';

type Props = {
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'inline' | 'page';
};

const sizeMap = {
  sm: 'site-loader--sm',
  md: 'site-loader--md',
  lg: 'site-loader--lg',
} as const;

export function SiteLoader({
  label = 'در حال بارگذاری',
  className,
  size = 'md',
  variant = 'inline',
}: Props) {
  const accessibleLabel = label.trim() || 'در حال بارگذاری';

  return (
    <div
      className={cn(
        'site-loader',
        sizeMap[size],
        variant === 'page' && 'site-loader--page',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={accessibleLabel}
    >
      <div className="site-loader__ring" aria-hidden>
        <span className="site-loader__arc" />
        <span className="site-loader__core" />
      </div>
      {variant === 'page' && label.trim() ? (
        <p className="site-loader__label">{label}</p>
      ) : null}
    </div>
  );
}
