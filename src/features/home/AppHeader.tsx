import { useNavigate } from 'react-router-dom'
import { Bell, BadgeCheck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Avatar } from '@/components/ui/Avatar'
import { roleLabels } from '@/data/labels'
import { toFa } from '@/lib/format'

export function AppHeader() {
  const navigate = useNavigate()
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const unread = useStore((s) => s.notifications.filter((n) => !n.read).length)
  if (!agent) return null

  return (
    <div className="flex items-center justify-between px-4 pt-[calc(14px+var(--safe-top))] pb-2">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-3">
        <Avatar id={agent.id} first={agent.firstName} last={agent.lastName} src={agent.avatar} size={46} online ring />
        <div className="text-right">
          <p className="flex items-center gap-1 text-[15px] font-extrabold text-neutral-900">
            {agent.firstName} {agent.lastName}
            <BadgeCheck size={15} className="text-primary-500" />
          </p>
          <p className="text-[11px] font-bold text-neutral-400">{roleLabels[agent.role]}</p>
        </div>
      </button>

      <button
        onClick={() => navigate('/notifications')}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-surface shadow-card border border-border/60 text-neutral-600"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-extrabold text-white ring-2 ring-background">
            {toFa(unread)}
          </span>
        )}
      </button>
    </div>
  )
}
