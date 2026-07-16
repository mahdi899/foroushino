import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

type Tick = {
  top: string;
  insetInlineStart?: string;
  insetInlineEnd?: string;
  size: number;
  rotate: number;
  opacity: number;
};

/** Full-height sidebar panel — toolbar through footer. */
const SIDEBAR_TICKS: Tick[] = [
  { top: '3%', insetInlineStart: '-6%', size: 118, rotate: -22, opacity: 0.2 },
  { top: '7%', insetInlineEnd: '4%', size: 52, rotate: 16, opacity: 0.24 },
  { top: '14%', insetInlineStart: '58%', size: 84, rotate: 11, opacity: 0.17 },
  { top: '21%', insetInlineStart: '8%', size: 38, rotate: -9, opacity: 0.28 },
  { top: '29%', insetInlineEnd: '-4%', size: 96, rotate: -18, opacity: 0.16 },
  { top: '36%', insetInlineStart: '34%', size: 64, rotate: 24, opacity: 0.21 },
  { top: '44%', insetInlineEnd: '18%', size: 44, rotate: -14, opacity: 0.26 },
  { top: '51%', insetInlineStart: '-2%', size: 76, rotate: 8, opacity: 0.18 },
  { top: '58%', insetInlineStart: '72%', size: 108, rotate: -26, opacity: 0.14 },
  { top: '66%', insetInlineEnd: '6%', size: 58, rotate: 19, opacity: 0.22 },
  { top: '74%', insetInlineStart: '22%', size: 42, rotate: -11, opacity: 0.25 },
  { top: '82%', insetInlineEnd: '28%', size: 88, rotate: 13, opacity: 0.17 },
  { top: '90%', insetInlineStart: '48%', size: 50, rotate: -20, opacity: 0.23 },
  { top: '96%', insetInlineEnd: '-8%', size: 72, rotate: 7, opacity: 0.19 },
];

const PROFILE_TICKS: Tick[] = [
  { top: '-32%', insetInlineStart: '42%', size: 72, rotate: -14, opacity: 0.22 },
  { top: '-6%', insetInlineEnd: '4%', size: 48, rotate: 20, opacity: 0.26 },
  { top: '22%', insetInlineStart: '68%', size: 92, rotate: 8, opacity: 0.18 },
  { top: '48%', insetInlineStart: '6%', size: 40, rotate: -22, opacity: 0.24 },
  { top: '62%', insetInlineEnd: '16%', size: 56, rotate: 12, opacity: 0.2 },
];

function VerifiedBadgeGlyph({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={style}
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
      />
      <polyline
        points="9 12 11.5 14.5 16 9.5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Blurred blue verified-check wallpaper — Telegram channel-info style. */
export function FamilyVerifiedPatternBackdrop({
  variant = 'sidebar',
  className,
}: {
  variant?: 'sidebar' | 'profile';
  className?: string;
}) {
  const ticks = variant === 'profile' ? PROFILE_TICKS : SIDEBAR_TICKS;

  return (
    <div
      className={cn('family-verified-pattern', `family-verified-pattern--${variant}`, className)}
      aria-hidden
    >
      {ticks.map((tick, index) => (
        <VerifiedBadgeGlyph
          key={index}
          className="family-verified-pattern__tick"
          style={{
            top: tick.top,
            insetInlineStart: tick.insetInlineStart,
            insetInlineEnd: tick.insetInlineEnd,
            width: tick.size,
            height: tick.size,
            opacity: tick.opacity,
            transform: `rotate(${tick.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
