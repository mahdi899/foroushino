import { Flame, Snowflake, Sun, Star } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { sourceIcon, sourceIconClass } from './icons'
import { sourceLabels, temperatureLabels } from '@/data/labels'
import type { LeadSource, Priority, Temperature } from '@/types'
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
  size?: 'sm' | 'md'
}) {
  const Icon = tempIcon[temperature]
  return (
    <Badge tone={temperature} size={size} icon={<Icon size={size === 'sm' ? 11 : 13} />}>
      {temperatureLabels[temperature]}
    </Badge>
  )
}

const sourceIconColor = sourceIconClass

export function SourceChip({ source, size = 'md' }: { source: LeadSource; size?: 'sm' | 'md' }) {
  const Icon = sourceIcon[source]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold text-neutral-500',
        size === 'sm' ? 'text-[11px]' : 'text-xs',
      )}
    >
      <Icon size={size === 'sm' ? 12 : 14} className={sourceIconColor[source]} />
      {sourceLabels[source]}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          size={13}
          className={
            i <= priority ? 'fill-warning-400 text-warning-400' : 'fill-neutral-200 text-neutral-200'
          }
        />
      ))}
    </span>
  )
}
