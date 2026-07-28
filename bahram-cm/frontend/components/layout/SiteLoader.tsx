'use client';

import { cn } from '@/lib/cn';

type Props = {
  /** Visible caption under the spinner. Pass empty string to hide. */
  label?: string;
  /** Overrides aria-label when visible label is empty. */
  ariaLabel?: string;
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
  label = '',
  ariaLabel,
  className,
  size = 'md',
  variant = 'inline',
}: Props) {
  const visibleLabel = label.trim();
  const accessibleLabel = (ariaLabel ?? (visibleLabel || 'در حال بارگذاری')).trim();

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
      {variant === 'page' && visibleLabel ? (
        <p className="site-loader__label">{visibleLabel}</p>
      ) : null}
    </div>
  );
}
