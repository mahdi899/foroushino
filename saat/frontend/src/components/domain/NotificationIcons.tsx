import type { ComponentType } from 'react'
import type { AppNotification } from '@/types'
import { cn } from '@/lib/cn'

type IconProps = { className?: string }

const box = 'h-[21px] w-[21px]'

export function NotifLeadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 21 21" fill="none" className={cn(box, className)} aria-hidden>
      <path
        d="M10.5 3.5c-2.2 0-4 1.6-4 3.6 0 1.2.6 2.3 1.5 3l-.6 2.4 2.5-.8c.6.2 1.2.3 1.9.3 2.2 0 4-1.6 4-3.6s-1.8-3.9-4.1-3.9Z"
        fill="currentColor"
      />
      <path d="M7.2 15.8h6.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".85" />
    </svg>
  )
}

export function NotifFollowupIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 21 21" fill="none" className={cn(box, className)} aria-hidden>
      <circle cx="10.5" cy="10.5" r="7.2" stroke="currentColor" strokeWidth="1.55" />
      <path d="M10.5 6.8v4.2l2.8 1.6" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function NotifAchievementIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 21 21" fill="none" className={cn(box, className)} aria-hidden>
      <path
        d="M7.2 4.2h6.6l.9 3.2 3.1 1.1-3.1 1.1-.9 3.2-.9-3.2-3.1-1.1 3.1-1.1.9-3.2Z"
        fill="currentColor"
      />
      <path d="M7.8 15.8h5.4l-.8 2.2H8.6l-.8-2.2Z" fill="currentColor" opacity=".9" />
    </svg>
  )
}

export function NotifSystemIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 21 21" fill="none" className={cn(box, className)} aria-hidden>
      <path
        d="M10.5 3.2c-3.4 0-6.2 2.4-6.2 5.4 0 1.8.9 3.4 2.3 4.4l-.5 2.8 2.9-.9c.8.2 1.6.4 2.5.4 3.4 0 6.2-2.4 6.2-5.4S13.9 3.2 10.5 3.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="8.2" cy="8.8" r=".9" fill="currentColor" />
      <circle cx="12.8" cy="8.8" r=".9" fill="currentColor" />
      <path d="M8.4 11.8c.8.8 1.8 1.2 2.9 1.2s2.1-.4 2.9-1.2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  )
}

export function NotifSaleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 21 21" fill="none" className={cn(box, className)} aria-hidden>
      <path
        d="M5.2 6.8h10.6l-1 8.4H6.2l-1-8.4Zm1.4-2.2h7.8l.6 2.2H6l.6-2.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8.4 10.2h4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function NotifCommissionIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 21 21" fill="none" className={cn(box, className)} aria-hidden>
      <path
        d="M4.8 7.2h11.4v8.6a1.2 1.2 0 0 1-1.2 1.2H6a1.2 1.2 0 0 1-1.2-1.2V7.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M7.2 5.8h6.6a1.2 1.2 0 0 1 1.2 1.2v.2H6V7a1.2 1.2 0 0 1 1.2-1.2Z" fill="currentColor" />
      <path d="M10.5 10.2v4.2M8.8 12.3h3.4" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
    </svg>
  )
}

export function NotifPayoutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 21 21" fill="none" className={cn(box, className)} aria-hidden>
      <rect x="3.8" y="6.2" width="13.4" height="9.2" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.8 9.2h13.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.2 13.2h6.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function NotifQualityIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 21 21" fill="none" className={cn(box, className)} aria-hidden>
      <path
        d="M10.5 3.8 5.2 6.2v5.1c0 3.1 2.2 5.9 5.3 6.7 3.1-.8 5.3-3.6 5.3-6.7V6.2L10.5 3.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M10.5 7.8v4.2M10.5 13.8h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function NotifShiftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 21 21" fill="none" className={cn(box, className)} aria-hidden>
      <circle cx="10.5" cy="10.5" r="7.2" stroke="currentColor" strokeWidth="1.55" />
      <path d="M8.8 7.8 13.6 10.5 8.8 13.2V7.8Z" fill="currentColor" />
    </svg>
  )
}

export const NOTIFICATION_ICON_STYLES: Record<
  AppNotification['kind'],
  { icon: ComponentType<IconProps>; tone: string }
> = {
  lead: { icon: NotifLeadIcon, tone: 'bg-[#FF6B00] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]' },
  followup: { icon: NotifFollowupIcon, tone: 'bg-[#FF9500] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]' },
  achievement: { icon: NotifAchievementIcon, tone: 'bg-[#FFB000] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]' },
  system: { icon: NotifSystemIcon, tone: 'bg-primary-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]' },
  sale: { icon: NotifSaleIcon, tone: 'bg-[#10A37F] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]' },
  commission: { icon: NotifCommissionIcon, tone: 'bg-primary-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]' },
  payout: { icon: NotifPayoutIcon, tone: 'bg-primary-400 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]' },
  quality: { icon: NotifQualityIcon, tone: 'bg-[#FF3B30] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]' },
  shift: { icon: NotifShiftIcon, tone: 'bg-[#526B80] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]' },
}
