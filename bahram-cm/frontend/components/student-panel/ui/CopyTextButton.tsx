'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/cn';

export function CopyTextButton({
  value,
  label = 'کپی',
  className,
  mono = true,
  showValue = true,
}: {
  value: string | null | undefined;
  label?: string;
  className?: string;
  mono?: boolean;
  showValue?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!value?.trim()) {
    return <span className="panel-text-meta text-text-muted">—</span>;
  }

  async function copy() {
    await navigator.clipboard.writeText(value!.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      {showValue ? (
        <code
          className={cn(
            'panel-text-meta min-w-0 flex-1 break-all rounded-lg border border-border/60 bg-surface-soft px-2.5 py-2 leading-relaxed text-text',
            mono && 'font-mono',
          )}
          dir="ltr"
        >
          {value}
        </code>
      ) : null}
      <button
        type="button"
        onClick={() => void copy()}
        className={cn(
          'panel-text-meta inline-flex shrink-0 items-center gap-1 rounded-lg border border-border/60 bg-surface px-2.5 py-2 font-medium text-text-muted transition hover:border-primary/30 hover:text-primary',
          !showValue && 'justify-center',
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'کپی شد' : label}
      </button>
    </div>
  );
}
