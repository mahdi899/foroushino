import type { ComponentType } from 'react'
import { cn } from '@/lib/cn'

type IconProps = { className?: string; active?: boolean }

const box = 'h-[14px] w-[14px]'

export function FilterAllIcon({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="none" className={cn(box, className)} aria-hidden>
      {active ? (
        <>
          <rect x="2" y="2" width="4.2" height="4.2" rx="1" fill="currentColor" />
          <rect x="7.8" y="2" width="4.2" height="4.2" rx="1" fill="currentColor" />
          <rect x="2" y="7.8" width="4.2" height="4.2" rx="1" fill="currentColor" />
          <rect x="7.8" y="7.8" width="4.2" height="4.2" rx="1" fill="currentColor" />
        </>
      ) : (
        <>
          <rect x="2.2" y="2.2" width="3.6" height="3.6" rx=".8" stroke="currentColor" strokeWidth="1.2" />
          <rect x="8" y="2.2" width="3.6" height="3.6" rx=".8" stroke="currentColor" strokeWidth="1.2" />
          <rect x="2.2" y="8" width="3.6" height="3.6" rx=".8" stroke="currentColor" strokeWidth="1.2" />
          <rect x="8" y="8" width="3.6" height="3.6" rx=".8" stroke="currentColor" strokeWidth="1.2" />
        </>
      )}
    </svg>
  )
}

export function FilterHotIcon({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="none" className={cn(box, className)} aria-hidden>
      <path
        d="M7.2 2.2c-1.2 2.1-2.4 3.4-2.4 5.2a2.4 2.4 0 1 0 4.8 0c0-1.2-.6-2.2-1.4-3.4.3 1.5.9 2.4 1.4 3.1-.2-1.8.4-3.4 1.2-4.9Z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.15}
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function FilterWarmIcon({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="none" className={cn(box, className)} aria-hidden>
      <circle cx="7" cy="7" r="2.8" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.15} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4
        const x1 = 7 + Math.cos(a) * 4.2
        const y1 = 7 + Math.sin(a) * 4.2
        const x2 = 7 + Math.cos(a) * 5.2
        const y2 = 7 + Math.sin(a) * 5.2
        return (
          <path
            key={i}
            d={`M${x1} ${y1} L${x2} ${y2}`}
            stroke="currentColor"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity={active ? 1 : 0.85}
          />
        )
      })}
    </svg>
  )
}

export function FilterColdIcon({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="none" className={cn(box, className)} aria-hidden>
      <path d="M7 2.2v9.6M4.4 4.8 7 7l2.6-2.2M4.4 9.2 7 7l2.6 2.2" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
      {active ? (
        <>
          <circle cx="7" cy="7" r="1.1" fill="currentColor" />
          <circle cx="7" cy="2.2" r=".7" fill="currentColor" />
          <circle cx="7" cy="11.8" r=".7" fill="currentColor" />
          <circle cx="4.4" cy="4.8" r=".7" fill="currentColor" />
          <circle cx="9.6" cy="4.8" r=".7" fill="currentColor" />
          <circle cx="4.4" cy="9.2" r=".7" fill="currentColor" />
          <circle cx="9.6" cy="9.2" r=".7" fill="currentColor" />
        </>
      ) : null}
    </svg>
  )
}

export function FilterTodayIcon({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="none" className={cn(box, className)} aria-hidden>
      <rect x="2.2" y="3.4" width="9.6" height="8.4" rx="1.4" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.15} />
      {!active ? (
        <>
          <path d="M4.6 2.4v1.8M9.4 2.4v1.8M2.2 5.8h9.6" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
          <rect x="4.8" y="7.2" width="1.8" height="1.8" rx=".35" fill="currentColor" />
        </>
      ) : (
        <>
          <path d="M4.6 2.4v1.2M9.4 2.4v1.2M2.2 5.4h9.6" stroke="white" strokeWidth="1" strokeLinecap="round" />
          <rect x="4.8" y="7.2" width="1.8" height="1.8" rx=".35" fill="white" />
        </>
      )}
    </svg>
  )
}

export function FilterOverdueIcon({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="none" className={cn(box, className)} aria-hidden>
      <path
        d="M7 2.4 3.2 11.6h7.6L7 2.4Z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.15}
        strokeLinejoin="round"
      />
      <path d="M7 5.8v2.4" stroke={active ? 'white' : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="7" cy="9.8" r=".65" fill={active ? 'white' : 'currentColor'} />
    </svg>
  )
}

export type LeadFilterId = 'all' | 'hot' | 'warm' | 'cold' | 'today' | 'overdue'

export const LEAD_FILTER_ICONS: Record<LeadFilterId, ComponentType<IconProps>> = {
  all: FilterAllIcon,
  hot: FilterHotIcon,
  warm: FilterWarmIcon,
  cold: FilterColdIcon,
  today: FilterTodayIcon,
  overdue: FilterOverdueIcon,
}

export const LEAD_FILTER_ACTIVE: Record<LeadFilterId, string> = {
  all: 'bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900',
  hot: 'text-white bg-hot-600',
  warm: 'text-white bg-warm-600',
  cold: 'text-white bg-cold-600',
  today: 'text-white bg-primary-600 dark:bg-primary-500',
  overdue: 'text-white bg-error-600',
}

export const LEAD_FILTER_INACTIVE: Record<LeadFilterId, string> = {
  all: 'text-text-soft',
  hot: 'text-hot-600 dark:text-hot-400',
  warm: 'text-warm-700 dark:text-warm-400',
  cold: 'text-cold-600 dark:text-cold-300',
  today: 'text-primary-700 dark:text-primary-400',
  overdue: 'text-error-600 dark:text-error-400',
}
