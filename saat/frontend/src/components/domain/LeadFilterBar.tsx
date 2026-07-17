import { LayoutGroup, motion } from 'framer-motion'
import { toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import {
  LEAD_FILTER_ACTIVE,
  LEAD_FILTER_ICONS,
  LEAD_FILTER_INACTIVE,
  type LeadFilterId,
} from '@/components/domain/LeadFilterIcons'
import { cn } from '@/lib/cn'

export type LeadFilterItem = {
  id: LeadFilterId
  label: string
}

interface LeadFilterBarProps {
  filters: LeadFilterItem[]
  active: LeadFilterId
  counts: Record<LeadFilterId, number>
  onChange: (id: LeadFilterId) => void
}

const spring = { type: 'spring' as const, stiffness: 520, damping: 38 }

export function LeadFilterBar({ filters, active, counts, onChange }: LeadFilterBarProps) {
  return (
    <LayoutGroup id="lead-filters">
      <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 py-1">
        {filters.map((f) => {
          const isActive = active === f.id
          const Icon = LEAD_FILTER_ICONS[f.id]
          const count = counts[f.id]

          return (
            <motion.button
              key={f.id}
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={spring}
              onClick={() => {
                haptic('selection')
                onChange(f.id)
              }}
              className={cn(
                'relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold',
                isActive ? 'text-white' : cn(LEAD_FILTER_INACTIVE[f.id], 'bg-black/[0.04] dark:bg-white/[0.06]'),
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="lead-filter-pill"
                  transition={spring}
                  className={cn('absolute inset-0 rounded-full shadow-sm', LEAD_FILTER_ACTIVE[f.id])}
                />
              ) : null}

              <Icon active={isActive} className="relative z-[1]" />
              <span className="relative z-[1]">{f.label}</span>

              {count > 0 && f.id !== 'all' ? (
                <span
                  className={cn(
                    'relative z-[1] rounded-full px-1.5 py-px text-[9px] font-bold tabular-nums',
                    isActive ? 'bg-white/22' : 'bg-black/[0.06] dark:bg-white/10',
                  )}
                >
                  {toFa(count)}
                </span>
              ) : null}
            </motion.button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
