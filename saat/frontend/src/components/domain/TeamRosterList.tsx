import { Phone, Shield, Star, UserRound } from 'lucide-react'
import type { Agent } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { toFa } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { TeamRosterView } from '@/lib/teamRoster'

function StaffRow({
  agent,
  roleLabel,
  icon: Icon,
}: {
  agent: Agent
  roleLabel: string
  icon: typeof Shield
}) {
  return (
    <div className="list-row flex items-center gap-3 rounded-[16px] p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400">
        <Icon size={15} strokeWidth={2.25} />
      </span>
      <Avatar id={agent.id} first={agent.firstName} last={agent.lastName} src={agent.avatar} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-text">
          {agent.firstName} {agent.lastName}
        </p>
        <p className="text-[11px] font-semibold text-text-soft">{roleLabel}</p>
      </div>
      {agent.points > 0 && (
        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-black/[0.04] px-2 py-1 text-[10px] font-bold tabular-nums text-text-soft dark:bg-white/[0.06]">
          <Star size={9} strokeWidth={2.5} className="text-amber-500" />
          {toFa(agent.points)}
        </span>
      )}
    </div>
  )
}

function AgentScoreRow({
  agent,
  rank,
  highlight,
}: {
  agent: Agent
  rank: number
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'list-row flex items-center gap-3 rounded-[16px] p-3',
        highlight && 'ring-1 ring-[#3390EC]/30 dark:ring-[#8774E1]/35',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black tabular-nums',
          rank === 1
            ? 'bg-amber-400/20 text-amber-700 dark:text-amber-300'
            : rank === 2
              ? 'bg-neutral-200/80 text-neutral-600 dark:bg-white/10 dark:text-neutral-300'
              : rank === 3
                ? 'bg-orange-400/15 text-orange-700 dark:text-orange-300'
                : 'bg-surface-soft text-text-soft',
        )}
      >
        {toFa(rank)}
      </span>
      <Avatar id={agent.id} first={agent.firstName} last={agent.lastName} src={agent.avatar} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-text">
          {agent.firstName} {agent.lastName}
          {highlight && <span className="mr-1 text-[10px] font-bold text-[#3390EC] dark:text-[#8774E1]">(تو)</span>}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-text-soft">
          <span className="inline-flex items-center gap-0.5 tabular-nums">
            <Star size={9} strokeWidth={2.5} className="text-amber-500" />
            {toFa(agent.points)} امتیاز
          </span>
          <span className="text-text-soft/40">·</span>
          <span className="inline-flex items-center gap-0.5 tabular-nums">
            <Phone size={9} strokeWidth={2.5} />
            {toFa(agent.successfulToday)} موفق
          </span>
        </p>
      </div>
      <div className="shrink-0 text-left">
        <p className="text-[14px] font-black tabular-nums text-text">{toFa(agent.callsToday)}</p>
        <p className="text-[9px] font-bold text-text-soft">تماس</p>
      </div>
    </div>
  )
}

interface TeamRosterListProps {
  roster: TeamRosterView
  meId: string
  maxHeightClass?: string
  className?: string
}

export function TeamRosterList({
  roster,
  meId,
  maxHeightClass = 'max-h-[300px]',
  className,
}: TeamRosterListProps) {
  const hasStaff = roster.supervisor != null || roster.leader != null
  const hasAgents = roster.agents.length > 0

  if (!hasStaff && !hasAgents) return null

  return (
    <div className={cn('mt-3 border-t border-white/40 pt-3 dark:border-white/8', className)}>
      <div className={cn('space-y-2 overflow-y-auto no-scrollbar', maxHeightClass)}>
        {roster.supervisor && (
          <StaffRow agent={roster.supervisor} roleLabel="ناظر تیم" icon={Shield} />
        )}
        {roster.leader && <StaffRow agent={roster.leader} roleLabel="سرتیم" icon={UserRound} />}
        {hasAgents && (
          <>
            <p className="sticky top-0 z-[1] bg-inherit px-1 pb-1 pt-1 text-[11px] font-bold text-text-soft">
              کارشناسان تیم
            </p>
            {roster.agents.map((agent, index) => (
              <AgentScoreRow
                key={agent.id}
                agent={agent}
                rank={index + 1}
                highlight={agent.id === meId}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
