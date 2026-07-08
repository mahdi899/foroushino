import type { SVGProps } from 'react';
import { cn } from '@/lib/cn';

type IconProps = SVGProps<SVGSVGElement> & { muted?: boolean };

export function WindowsLogo({ className, muted, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-9 w-9', className)} aria-hidden {...props}>
      <path fill={muted ? 'currentColor' : '#00A4EF'} d="M3 4.5 10.5 3.45V11.5H3V4.5Z" />
      <path fill={muted ? 'currentColor' : '#7FBA00'} d="M11.5 3.35 21 1.85V11.5H11.5V3.35Z" />
      <path fill={muted ? 'currentColor' : '#FFB900'} d="M3 12.5H10.5V20.55L3 19.5V12.5Z" />
      <path fill={muted ? 'currentColor' : '#F25022'} d="M11.5 12.5H21V22.15L11.5 20.65V12.5Z" />
    </svg>
  );
}

export function AppleLogo({ className, muted, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-9 w-9', className)} aria-hidden {...props}>
      <path
        fill="currentColor"
        d="M16.84 13.13c-.03-2.88 2.35-4.27 2.46-4.34-1.34-1.96-3.42-2.23-4.16-2.26-1.77-.18-3.46 1.04-4.36 1.04-.9 0-2.29-1.02-3.77-.99-1.94.03-3.72 1.13-4.72 2.87-2.01 3.49-.51 8.65 1.44 11.49.96 1.39 2.1 2.95 3.6 2.89 1.45-.06 1.99-.93 3.74-.93 1.75 0 2.24.93 3.77.9 1.56-.03 2.54-1.41 3.48-2.81 1.1-1.6 1.55-3.15 1.58-3.23-.04-.02-3.03-1.16-3.06-4.63Z"
      />
      <path
        fill="currentColor"
        d="M14.32 4.38c.8-.97 1.34-2.32 1.19-3.67-1.15.05-2.54.77-3.37 1.73-.74.86-1.39 2.24-1.22 3.56 1.29.1 2.61-.66 3.4-1.62Z"
        opacity={muted ? 0.55 : 1}
      />
    </svg>
  );
}

export function AndroidLogo({ className, muted, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-9 w-9', className)} aria-hidden {...props}>
      <path
        fill={muted ? 'currentColor' : '#3DDC84'}
        d="M17.6 9.48c.78 0 1.41-.63 1.41-1.41s-.63-1.41-1.41-1.41-1.41.63-1.41 1.41.63 1.41 1.41 1.41Zm-11.2 0c.78 0 1.41-.63 1.41-1.41S7.18 6.66 6.4 6.66 5 7.29 5 8.07s.63 1.41 1.4 1.41Zm11.01-4.5 1.97-3.4a.56.56 0 0 0-.97-.56l-2 3.46C14.84 4.6 13.49 4.1 12 4.1s-2.84.5-4.01 1.38L5.99 2.02a.56.56 0 1 0-.97.56l1.97 3.4C4.7 7.73 3.5 10.2 3.5 13h17c0-2.8-1.2-5.27-3.09-7.02ZM4 14v5.5c0 .83.67 1.5 1.5 1.5h1c.83 0 1.5-.67 1.5-1.5V14H4Zm12.5 7c.83 0 1.5-.67 1.5-1.5V14h-3v5.5c0 .83.67 1.5 1.5 1.5h0Zm2.5-7v5.5c0 .83.67 1.5 1.5 1.5h1c.83 0 1.5-.67 1.5-1.5V14h-4Z"
      />
    </svg>
  );
}

export function WebLogo({ className, muted, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-9 w-9', className)} aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={muted ? 0.45 : 0.9} />
      <ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={muted ? 0.45 : 0.9} />
      <path d="M3.5 9h17M3.5 15h17" stroke="currentColor" strokeWidth="1.5" opacity={muted ? 0.45 : 0.9} />
      <circle cx="12" cy="12" r="2.2" fill={muted ? 'currentColor' : 'var(--color-primary)'} opacity={muted ? 0.35 : 1} />
    </svg>
  );
}

export function UbuntuLogo({ className, muted, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-9 w-9', className)} aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" fill={muted ? 'currentColor' : '#E95420'} opacity={muted ? 0.35 : 0.18} />
      <circle cx="6.8" cy="12" r="2.1" fill={muted ? 'currentColor' : '#E95420'} />
      <circle cx="15.5" cy="7.6" r="2.1" fill={muted ? 'currentColor' : '#E95420'} />
      <circle cx="15.5" cy="16.4" r="2.1" fill={muted ? 'currentColor' : '#E95420'} />
      <path
        d="M8.5 12h2.2M13.2 8.9l1.1 1.9M13.2 15.1l1.1-1.9"
        stroke={muted ? 'currentColor' : '#E95420'}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity={muted ? 0.4 : 1}
      />
    </svg>
  );
}

export function IosLogo({ className, muted, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-9 w-9', className)} aria-hidden {...props}>
      <rect
        x="7"
        y="3"
        width="10"
        height="18"
        rx="2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity={muted ? 0.4 : 0.95}
      />
      <circle cx="12" cy="18.2" r="1" fill="currentColor" opacity={muted ? 0.35 : 0.85} />
      <rect x="9.5" y="5.5" width="5" height="9.5" rx="1" fill={muted ? 'currentColor' : 'var(--color-primary)'} opacity={muted ? 0.3 : 0.85} />
    </svg>
  );
}
