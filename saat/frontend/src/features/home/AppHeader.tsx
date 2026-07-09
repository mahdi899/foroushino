import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BadgeCheck, ChevronDown } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Avatar } from '@/components/ui/Avatar'
import { AvailabilitySheet } from '@/components/domain/AvailabilitySwitcher'
import { availabilityDotClass } from '@/components/domain/icons'
import { availabilityLabels, roleLabels } from '@/data/labels'
import { cn } from '@/lib/cn'

export function AppHeader() {
  const navigate = useNavigate()
  const [statusOpen, setStatusOpen] = useState(false)
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const unread = useStore((s) => s.notifications.filter((n) => !n.read).length)
  const availability = useStore((s) => s.availability)
  const workSession = useStore((s) => s.workSession)
  if (!agent) return null

  const shiftActive = Boolean(workSession?.startedAt)
  const showStatus = agent.role === 'agent'

  return (
    <>
      <header className="glass-header sticky top-0 z-20 px-3 pt-[calc(6px+var(--safe-top))] pb-2.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <Avatar
              id={agent.id}
              first={agent.firstName}
              last={agent.lastName}
              src={agent.avatar}
              size={44}
              online={shiftActive && availability === 'available'}
              onlineClassName={availabilityDotClass[availability]}
              ring
            />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex min-w-0 shrink flex-col items-start gap-0.5 overflow-hidden text-right"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[17px] font-bold leading-tight tracking-tight text-neutral-900">
                  {agent.firstName} {agent.lastName}
                </span>
                <BadgeCheck size={16} className="shrink-0 text-primary-500" strokeWidth={2.5} />
              </span>
              <span className="truncate text-[11px] font-medium leading-none text-[#8E8E93] dark:text-[#98989D]">
                {roleLabels[agent.role]}
              </span>
            </button>

            {showStatus && (
              <button
                type="button"
                onClick={() => (shiftActive ? setStatusOpen(true) : navigate('/shift-start'))}
                className={cn(
                  'inline-flex h-9 max-w-full shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 shadow-sm transition-all active:scale-[0.97]',
                  shiftActive
                    ? 'glass-inset border-white/55 text-neutral-600 dark:border-white/10 dark:text-neutral-300'
                    : 'border-warning-200/80 bg-warning-50/90 text-warning-700',
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full ring-2 ring-white/80 dark:ring-black/20',
                    shiftActive ? availabilityDotClass[availability] : 'bg-warning-500',
                  )}
                />
                <span className="truncate text-[13px] font-bold leading-none">
                  {shiftActive ? availabilityLabels[availability] : 'شیفت را شروع کن'}
                </span>
                <ChevronDown
                  size={14}
                  strokeWidth={2.5}
                  className={cn('shrink-0 opacity-45', !shiftActive && 'text-warning-600')}
                />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/notifications')}
            aria-label={unread > 0 ? `اعلان‌ها — ${unread} خوانده‌نشده` : 'اعلان‌ها'}
            className="glass-inset relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm transition-all active:scale-95"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-1.5 top-0.5 h-[42%] rounded-t-full bg-gradient-to-b from-white/75 to-transparent dark:from-white/15"
            />
            <Bell
              size={20}
              strokeWidth={2.25}
              className="relative z-[1] fill-[#3390EC]/25 text-[#3390EC] drop-shadow-[0_2px_5px_rgba(51,144,236,0.4)] dark:fill-[#8774E1]/25 dark:text-[#8774E1] dark:drop-shadow-[0_2px_5px_rgba(135,116,225,0.45)]"
            />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 z-[2] flex h-3 w-3" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning-400 opacity-70" />
                <span className="notify-blink relative inline-flex h-3 w-3 rounded-full bg-warning-500 ring-2 ring-background shadow-[0_0_6px_rgba(255,176,0,0.7)]" />
              </span>
            )}
          </button>
        </div>
      </header>

      {showStatus && <AvailabilitySheet open={statusOpen} onClose={() => setStatusOpen(false)} />}
    </>
  )
}
