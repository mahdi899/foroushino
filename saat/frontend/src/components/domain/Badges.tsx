import { Flame, Snowflake, Sun, Star, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { resolveSourceIcon, resolveSourceIconClass } from './icons'
import { getSourceLabel } from '@/lib/leadSources'
import { temperatureLabels, leadStatusLabels, leadStatusTone } from '@/data/labels'
import { useStore } from '@/store/useStore'
import type { LeadSource, LeadStatus, Priority, Temperature } from '@/types'
import { cn } from '@/lib/cn'

const tempIcon = {
  hot: Flame,
  warm: Sun,
  cold: Snowflake,
}

export function ContactStatusBadge({
  temperature,
  size = 'md',
}: {
  temperature: Temperature
  size?: 'sm' | 'md' | 'lg'
}) {
  const Icon = tempIcon[temperature]
  const iconSize = size === 'sm' ? 11 : size === 'lg' ? 15 : 13
  return (
    <Badge tone={temperature} size={size} icon={<Icon size={iconSize} />}>
      {temperatureLabels[temperature]}
    </Badge>
  )
}

export function SourceChip({ source, size = 'md' }: { source: LeadSource; size?: 'sm' | 'md' | 'lg' }) {
  const leadSources = useStore((s) => s.leadSources)
  const Icon = resolveSourceIcon(source)
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14
  return (
    <span
      className={cn(
        'glass-inset inline-flex items-center gap-1 rounded-full border border-white/50 font-semibold text-[#8E8E93] dark:border-white/10 dark:text-[#98989D]',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : size === 'lg' ? 'px-3 py-1.5 text-[13px]' : 'px-2.5 py-1 text-xs',
      )}
    >
      <Icon size={iconSize} className={resolveSourceIconClass(source)} />
      {getSourceLabel(source, leadSources)}
    </span>
  )
}

export function LeadStatusBadge({ status, size = 'md' }: { status: LeadStatus; size?: 'sm' | 'md' }) {
  return (
    <Badge tone={leadStatusTone[status]} size={size}>
      {leadStatusLabels[status]}
    </Badge>
  )
}

export function LockBadge({ agentName, size = 'md' }: { agentName?: string; size?: 'sm' | 'md' }) {
  return (
    <Badge tone="error" size={size} icon={<Lock size={size === 'sm' ? 11 : 13} />}>
      {agentName ? `قفل توسط ${agentName}` : 'قفل شده'}
    </Badge>
  )
}

export function PriorityBadge({ priority, size = 'md' }: { priority: Priority; size?: 'md' | 'lg' }) {
  const starSize = size === 'lg' ? 16 : 13
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          size={starSize}
          className={
            i <= priority ? 'fill-warning-400 text-warning-400' : 'fill-neutral-200 text-neutral-200'
          }
        />
      ))}
    </span>
  )
}
