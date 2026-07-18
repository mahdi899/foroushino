import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Avatar } from '@/components/ui/Avatar'
import type { AgentMetricBreakdown, TeamMetricKind } from '@/lib/teamMetricBreakdown'
import { metricSheetTitle } from '@/lib/teamMetricBreakdown'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

type TeamMetricDetailSheetProps = {
  open: boolean
  kind: TeamMetricKind | null
  rows: AgentMetricBreakdown[]
  onClose: () => void
}

export function TeamMetricDetailSheet({ open, kind, rows, onClose }: TeamMetricDetailSheetProps) {
  const navigate = useNavigate()
  const title = kind ? metricSheetTitle(kind) : ''

  return (
    <BottomSheet open={open} onClose={onClose} title={title} className="max-h-[88%]">
      {rows.length === 0 ? (
        <p className="py-8 text-center text-[13px] font-semibold text-text-soft">موردی برای نمایش نیست.</p>
      ) : (
        <div className="space-y-3 pb-2">
          {rows.map((row) => (
            <div
              key={row.agentId}
              className="glass-card overflow-hidden rounded-[18px] border border-white/55 dark:border-white/10"
            >
              <div className="flex items-center gap-3 border-b border-white/40 px-3.5 py-3 dark:border-white/8">
                <Avatar
                  id={row.agentId}
                  first={row.agentName.split(' ')[0] ?? row.agentName}
                  last={row.agentName.split(' ').slice(1).join(' ')}
                  size={36}
                />
                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate text-[14px] font-bold text-text">{row.agentName}</p>
                  <p className="text-[11px] font-semibold text-text-soft">
                    {row.items.length > 0
                      ? `${row.value} مورد`
                      : kind === 'calls'
                        ? `${row.value} تماس`
                        : kind === 'conversion'
                          ? `نرخ ${row.value}`
                          : `${row.value} مورد`}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[12px] font-black tabular-nums',
                    kind === 'overdue'
                      ? 'bg-red-500/12 text-red-700 dark:text-red-400'
                      : 'bg-primary-500/10 text-primary-700 dark:text-primary-300',
                  )}
                >
                  {row.value}
                </span>
              </div>

              {row.items.length > 0 ? (
                <div className="divide-y divide-white/35 dark:divide-white/8">
                  {row.items.map((item) => (
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
                        'flex w-full items-center gap-2 px-3.5 py-2.5 text-right transition-colors',
                        item.leadId && 'active:bg-black/[0.03] dark:active:bg-white/[0.04]',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-text">{item.title}</p>
                        <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-text-soft">
                          {item.subtitle}
                        </p>
                      </div>
                      {item.leadId ? (
                        <ChevronLeft size={16} className="shrink-0 text-text-soft" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  )
}
