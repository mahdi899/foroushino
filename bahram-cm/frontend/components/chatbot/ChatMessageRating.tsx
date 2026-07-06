'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageRatingProps {
  value?: number;
  onRate: (rating: number) => void | Promise<void>;
  disabled?: boolean;
  /** Shown under the stars — defaults to generic copy. */
  prompt?: string;
}

export function ChatMessageRating({ value, onRate, disabled, prompt }: ChatMessageRatingProps) {
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  async function handleRate(stars: number) {
    if (disabled || submitting || value) return;
    setSubmitting(true);
    try {
      await onRate(stars);
    } finally {
      setSubmitting(false);
    }
  }

  const active = value ?? hover;

  return (
    <div className="mt-1.5 flex items-center justify-end gap-1.5" dir="rtl">
      <span className="text-[9px] text-text-muted">
        {value ? 'ممنون از امتیاز شما' : (prompt ?? 'این پاسخ چطور بود؟')}
      </span>
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => !value && setHover(0)}
        role="group"
        aria-label="امتیاز به پاسخ"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled || submitting || !!value}
            onMouseEnter={() => !value && setHover(star)}
            onClick={() => void handleRate(star)}
            className={cn(
              'rounded p-0.5 transition disabled:cursor-default',
              !value && !disabled && 'hover:scale-110 active:scale-95',
            )}
            aria-label={`${star} از ۵ ستاره`}
            aria-pressed={value === star}
          >
            <Star
              className={cn(
                'h-3 w-3',
                star <= active ? 'fill-amber-400 text-amber-400' : 'text-border',
              )}
              strokeWidth={1.75}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
