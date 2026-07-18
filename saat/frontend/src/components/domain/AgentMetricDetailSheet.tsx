import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '@/components/ui/BottomSheet'
import type { MetricDetailItem, TeamMetricKind } from '@/lib/teamMetricBreakdown'
import { metricSheetTitle } from '@/lib/teamMetricBreakdown'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

type AgentMetricDetailSheetProps = {
  open: boolean
  kind: TeamMetricKind | null
  items: MetricDetailItem[]
  onClose: () => void
}

export function AgentMetricDetailSheet({ open, kind, items, onClose }: AgentMetricDetailSheetProps) {
  const navigate = useNavigate()
  const title = kind ? metricSheetTitle(kind, 'self') : ''

  return (
    <BottomSheet open={open} onClose={onClose} title={title} className="max-h-[88%]">
      {items.length === 0 ? (
        <p className="py-8 text-center text-[13px] font-semibold text-text-soft">موردی برای نمایش نیست.</p>
      ) : (
        <div className="glass-card divide-y divide-white/35 overflow-hidden rounded-[18px] border border-white/55 dark:divide-white/8 dark:border-white/10">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (!item.leadId) return
                haptic('selection')
                onClose()
                navigate(`/leads/${item.leadId}`)
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3.5 py-3 text-right transition-colors',
                item.leadId && 'active:bg-black/[0.03] dark:active:bg-white/[0.04]',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-text">{item.title}</p>
                <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-text-soft">{item.subtitle}</p>
              </div>
              {item.leadId ? <ChevronLeft size={16} className="shrink-0 text-text-soft" /> : null}
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  )
}
