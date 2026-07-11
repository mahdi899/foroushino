'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

type OtpDigitInputProps = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  compact?: boolean;
  theme?: 'login' | 'panel';
};

export function OtpDigitInput({
  length = 5,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = false,
  compact = false,
  theme = 'login',
}: OtpDigitInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, ' ').slice(0, length).split('').map((c) => (c === ' ' ? '' : c));

  const focusIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index));
    inputsRef.current[clamped]?.focus();
    inputsRef.current[clamped]?.select();
  }, [length]);

  const updateValue = useCallback(
    (next: string) => {
      const sanitized = next.replace(/\D/g, '').slice(0, length);
      onChange(sanitized);
      if (sanitized.length === length) {
        onComplete?.(sanitized);
      }
      return sanitized;
    },
    [length, onChange, onComplete],
  );

  useEffect(() => {
    if (autoFocus) {
      focusIndex(0);
    }
  }, [autoFocus, focusIndex]);

  function handleDigitChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const chars = digits.slice();
    chars[index] = digit;
    updateValue(chars.join(''));
    if (digit && index < length - 1) {
      focusIndex(index + 1);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        e.preventDefault();
        const chars = digits.slice();
        chars[index - 1] = '';
        updateValue(chars.join(''));
        focusIndex(index - 1);
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusIndex(index - 1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusIndex(index + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    updateValue(pasted);
    focusIndex(Math.min(pasted.length, length - 1));
  }

  return (
    <div dir="ltr" className="flex items-center justify-center gap-1.5 sm:gap-2" role="group" aria-label="کد تایید">
      {Array.from({ length }).map((_, index) => {
        const filled = Boolean(digits[index]);
        return (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digits[index]}
            disabled={disabled}
            aria-label={`رقم ${index + 1}`}
            className={cn(
              theme === 'panel'
                ? cn(
                    'panel-otp-cell',
                    compact && 'panel-otp-cell--compact',
                    filled && 'panel-otp-cell--filled',
                    error && 'panel-otp-cell--error',
                    disabled && 'panel-otp-cell--disabled',
                  )
                : cn(
                    'otp-cell border-2 bg-charcoal/70 text-center font-bold tabular-nums text-bone outline-none transition-all duration-200',
                    compact
                      ? 'h-11 w-9 rounded-lg text-lg'
                      : 'h-12 w-10 rounded-xl text-xl sm:h-14 sm:w-11 sm:rounded-2xl sm:text-2xl',
                    filled
                      ? 'border-emerald/45 bg-emerald/8'
                      : 'border-bone/12 hover:border-bone/22',
                    'focus:border-emerald-glow focus:bg-emerald/10 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-emerald-glow)_22%,transparent)]',
                    error && 'border-gold/55 focus:border-gold/70 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-gold)_18%,transparent)]',
                    disabled && 'cursor-not-allowed opacity-60',
                  ),
            )}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.currentTarget.select()}
          />
        );
      })}
    </div>
  );
}
