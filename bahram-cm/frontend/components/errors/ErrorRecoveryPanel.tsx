'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const ServiceUnavailableAnimation = dynamic(
  () =>
    import('./ServiceUnavailableAnimation').then((m) => m.ServiceUnavailableAnimation),
  { ssr: false, loading: () => <div className="mx-auto mb-2 h-60 w-full max-w-[18rem]" aria-hidden /> },
);

interface ErrorRecoveryPanelProps {
  title: string;
  description: string;
  onRetry: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorRecoveryPanel({
  title,
  description,
  onRetry,
  className,
  compact = false,
}: ErrorRecoveryPanelProps) {
  const [retrying, setRetrying] = useState(false);

  function handleManualRetry() {
    setRetrying(true);
    onRetry();
    window.setTimeout(() => setRetrying(false), 1200);
  }

  return (
    <div className={cn('error-panel-in relative text-center', className)}>
      <div className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-gradient-to-b from-primary/8 via-transparent to-accent/10 blur-2xl" />

      <div className="relative">
        <ServiceUnavailableAnimation />

        <h1 className={cn('font-extrabold text-primary-dark', compact ? 'text-h3' : 'text-h2')}>
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-body leading-7 text-text-muted">{description}</p>

        <button
          type="button"
          onClick={handleManualRetry}
          disabled={retrying}
          className="btn btn-primary relative mx-auto mt-6 inline-flex min-w-[9.5rem] gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', retrying && 'animate-spin')} />
          {retrying ? 'در حال بارگذاری…' : 'تلاش دوباره'}
        </button>
      </div>
    </div>
  );
}
