import { cn } from '@/lib/cn'

type IconProps = { className?: string }

const box = 'h-[22px] w-[22px]'

export function QuickCallIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 22 22" fill="none" className={cn(box, className)} aria-hidden>
      <path
        d="M7.1 3.4c.4-.9 1.4-1.3 2.3-.9l1.5.7c.7.3 1.1 1.1.9 1.9l-.4 1.6c-.1.5.1 1 .5 1.3l1.2 1c1.5 1.2 2.7 2.8 3.5 4.6l.6 1.4c.3.7.1 1.5-.5 1.9l-1.3.9c-.8.6-1.9.5-2.6-.2l-.8-.8c-.8-.8-2-.9-2.9-.2-1.5 1.1-3.2 2-5 2.6-.5.2-1 .4-1.4.1l-1.1-.8C1.8 15.5 1.5 14 2 12.6c1.4-4 4.4-7.3 8.3-9.1.5-.2 1-.1 1.4.2l.8.7c.7.7.7 1.8.1 2.5l-.5.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function QuickOverdueIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 22 22" fill="none" className={cn(box, className)} aria-hidden>
      <path
        d="M11 3.2 4.2 17.4h13.6L11 3.2Zm0 4.2.9 5.2h-1.8L11 7.4Zm0 7.4c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function QuickTodayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 22 22" fill="none" className={cn(box, className)} aria-hidden>
      <path
        d="M6.2 3.8V5.6M15.8 3.8V5.6M4.4 8.4h13.2M6.2 4.8h9.6c1.2 0 2.2 1 2.2 2.2v9.2c0 1.2-1 2.2-2.2 2.2H6.2c-1.2 0-2.2-1-2.2-2.2V7c0-1.2 1-2.2 2.2-2.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect x="7.4" y="10.8" width="2.8" height="2.8" rx=".6" fill="currentColor" />
      <rect x="11.8" y="10.8" width="2.8" height="2.8" rx=".6" fill="currentColor" />
    </svg>
  )
}

export function QuickLeadsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 22 22" fill="none" className={cn(box, className)} aria-hidden>
      <circle cx="8" cy="7.8" r="2.4" fill="currentColor" />
      <path
        d="M4.8 16.2c0-2 1.6-3.2 3.6-3.2h3.2c2 0 3.6 1.2 3.6 3.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="15.2" cy="8.2" r="1.9" fill="currentColor" opacity=".75" />
      <path
        d="M13.2 12.4c1.4 0 2.5.8 2.5 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity=".75"
      />
    </svg>
  )
}

export function QuickNewFollowupIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 22 22" fill="none" className={cn(box, className)} aria-hidden>
      <path
        d="M6.2 4.2V6M15.8 4.2V6M4.6 8.2h12.8M6.2 5.4h9.6c1.1 0 2 .9 2 2v8.8c0 1.1-.9 2-2 2H6.2c-1.1 0-2-.9-2-2V7.4c0-1.1.9-2 2-2Z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
      <path d="M11 10.8v5.2M8.4 13.4h5.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export const QUICK_ACTION_ICON_STYLES = {
  call: 'bg-primary-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]',
  overdue: 'bg-[#FF9500] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]',
  today: 'bg-primary-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]',
  leads: 'bg-primary-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]',
  newFollowup: 'bg-primary-400 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]',
} as const
