import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Phone, Unlock, Clock } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { LeadAvatar } from '@/components/domain/LeadAvatar'
import type { Lead } from '@/types'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'

function useCountdown(target: string | null) {
  const [ms, setMs] = useState(() => (target ? new Date(target).getTime() - Date.now() : 0))
  useEffect(() => {
    if (!target) return
    const t = setInterval(() => setMs(new Date(target).getTime() - Date.now()), 1000)
    return () => clearInterval(t)
  }, [target])
  return Math.max(0, ms)
}

export function LockedLeadsScreen() {
  const navigate = useNavigate()
  const currentAgentId = useStore((s) => s.currentAgentId)
  const leads = useStore((s) => s.leads.filter((l) => l.lockedBy === currentAgentId))
  const releaseLead = useStore((s) => s.releaseLead)
  const openCallMethodSheet = useStore((s) => s.openCallMethodSheet)
  const pushToast = useStore((s) => s.pushToast)

  return (
    <Page withNav={false}>
      <TopBar title="مشتریان قفل‌شده من" subtitle={`${toFa(leads.length)} مشتری در حال بررسی`} />

      <div className="space-y-3 px-4">
        {leads.length === 0 ? (
          <EmptyState
            title="مشتری قفل‌شده‌ای نداری"
            description="وقتی روی یک مشتری تمرکز کنی، اینجا نمایش داده می‌شود."
          />
        ) : (
          leads.map((lead) => (
            <LockedLeadRow
              key={lead.id}
              lead={lead}
              lockedUntil={lead.lockedUntil ?? null}
              onCall={() => {
                haptic('medium')
                openCallMethodSheet(lead)
              }}
              onRelease={() => {
                haptic('light')
                releaseLead(lead.id)
                pushToast('قفل مشتری آزاد شد')
              }}
              onOpen={() => navigate(`/leads/${lead.id}`)}
            />
          ))
        )}
      </div>
    </Page>
  )
}

function LockedLeadRow({
  lead,
  lockedUntil,
  onCall,
  onRelease,
  onOpen,
}: {
  lead: Lead
  lockedUntil: string | null
  onCall: () => void
  onRelease: () => void
  onOpen: () => void
}) {
  const remainingMs = useCountdown(lockedUntil)
  const remainingMin = Math.ceil(remainingMs / 60000)

  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-3.5 shadow-card">
      <button onClick={onOpen} className="flex w-full items-center gap-3 text-right">
        <LeadAvatar lead={lead} size={46} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-extrabold text-neutral-900">
            {lead.firstName} {lead.lastName}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-error-500">
            <Lock size={11} />
            قفل فعال
          </p>
        </div>
        {lockedUntil && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-extrabold text-neutral-500 tabular-nums">
            <Clock size={11} />
            {toFa(Math.max(0, remainingMin))} دقیقه
          </span>
        )}
      </button>
      <div className="mt-3 flex gap-2">
        <Button variant="soft" size="sm" className="flex-1" icon={<Unlock size={14} />} onClick={onRelease}>
          آزاد کردن
        </Button>
        <Button size="sm" className="flex-1" icon={<Phone size={14} />} onClick={onCall}>
          تماس بگیر
        </Button>
      </div>
    </div>
  )
}
