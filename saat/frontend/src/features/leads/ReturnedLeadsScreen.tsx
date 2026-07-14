import { useNavigate } from 'react-router-dom'
import { Undo2, RotateCcw } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { LeadAvatar } from '@/components/domain/LeadAvatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { relativeDayTime, toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'

export function ReturnedLeadsScreen() {
  const navigate = useNavigate()
  const leads = useStore((s) => s.leads.filter((l) => l.returnedToPool))
  const reclaimLead = useStore((s) => s.reclaimLead)
  const pushToast = useStore((s) => s.pushToast)

  return (
    <Page withNav={false}>
      <TopBar title="سرنخ‌های برگشت‌خورده" subtitle={`${toFa(leads.length)} لید در صف عمومی`} />

      <div className="space-y-3 px-4">
        {leads.length === 0 ? (
          <EmptyState
            title="لید برگشت‌خورده‌ای نیست"
            description="سرنخ‌هایی که بی‌پاسخ بمانند یا رها شوند، اینجا برای بازپس‌گیری نمایش داده می‌شوند."
          />
        ) : (
          leads.map((lead) => {
            const history = lead.statusHistory ?? []
            const lastEvent = history[history.length - 1]
            return (
              <div key={lead.id} className="rounded-2xl border border-border/60 bg-surface p-3.5 shadow-card">
                <button
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="flex w-full items-center gap-3 text-right"
                >
                  <LeadAvatar lead={lead} size={46} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-extrabold text-neutral-900">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-neutral-400">
                      <Undo2 size={11} />
                      {lastEvent?.note ?? relativeDayTime(lastEvent?.at ?? lead.lastCallAt ?? '')}
                    </p>
                  </div>
                </button>
                <Button
                  full
                  size="sm"
                  className="mt-3"
                  icon={<RotateCcw size={14} />}
                  onClick={() => {
                    haptic('success')
                    reclaimLead(lead.id)
                    pushToast('لید دوباره به تو اختصاص داده شد')
                  }}
                >
                  بازپس‌گیری این لید
                </Button>
              </div>
            )
          })
        )}
      </div>
    </Page>
  )
}
