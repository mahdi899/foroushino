import { useNavigate } from 'react-router-dom'
import { Bell, BadgeCheck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Avatar } from '@/components/ui/Avatar'
import { AvailabilityPill } from '@/components/domain/AvailabilitySwitcher'
import { roleLabels } from '@/data/labels'
import { toFa } from '@/lib/format'

export function AppHeader() {
  const navigate = useNavigate()
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const unread = useStore((s) => s.notifications.filter((n) => !n.read).length)
  if (!agent) return null

  return (
    <div className="space-y-2.5 px-4 pt-[calc(14px+var(--safe-top))] pb-3">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/profile')}
          className="flex min-w-0 items-center gap-3 text-right"
        >
          <Avatar
            id={agent.id}
            first={agent.firstName}
            last={agent.lastName}
            src={agent.avatar}
            size={42}
            online
            ring
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-[15px] font-extrabold tracking-tight text-neutral-900">
              {agent.firstName} {agent.lastName}
              <BadgeCheck size={14} className="shrink-0 text-primary-500" />
            </p>
            <p className="truncate text-[11px] font-semibold text-neutral-400">
              {roleLabels[agent.role]}
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate('/notifications')}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-border/70 bg-surface text-neutral-500 shadow-sm"
        >
          <Bell size={18} strokeWidth={2.25} />
          {unread > 0 && (
            <span className="absolute -top-1 -left-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-[9px] font-extrabold text-white ring-2 ring-background">
              {toFa(unread)}
            </span>
          )}
        </button>
      </div>

      {agent.role === 'agent' && (
        <div className="flex items-center gap-2">
          <AvailabilityPill />
        </div>
      )}
    </div>
  )
}
