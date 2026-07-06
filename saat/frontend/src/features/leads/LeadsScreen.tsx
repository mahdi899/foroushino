import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Users, Flame, Sun, Snowflake, CalendarClock, AlertTriangle, Lock, Undo2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { LeadCard } from '@/components/domain/LeadCard'
import { LeadQuickViewSheet } from '@/components/domain/LeadQuickViewSheet'
import { EmptyState } from '@/components/ui/States'
import { isToday, isOverdue, toFa } from '@/lib/format'
import { canCallLead } from '@/lib/leadUtils'
import { haptic } from '@/lib/telegram'
import type { Lead } from '@/types'

type Filter = 'all' | 'hot' | 'warm' | 'cold' | 'today' | 'overdue'

const filters: { id: Filter; label: string; icon?: typeof Flame; tone: ChipTone }[] = [
  { id: 'all', label: 'همه', tone: 'neutral' },
  { id: 'hot', label: 'داغ', icon: Flame, tone: 'hot' },
  { id: 'warm', label: 'گرم', icon: Sun, tone: 'warm' },
  { id: 'cold', label: 'سرد', icon: Snowflake, tone: 'cold' },
  { id: 'today', label: 'پیگیری امروز', icon: CalendarClock, tone: 'primary' },
  { id: 'overdue', label: 'عقب‌افتاده', icon: AlertTriangle, tone: 'error' },
]

export function LeadsScreen() {
  const navigate = useNavigate()
  const leads = useStore((s) => s.leads)
  const agents = useStore((s) => s.agents)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const startCall = useStore((s) => s.startCall)
  const [searchParams] = useSearchParams()
  const tempParam = searchParams.get('temp')
  const initialFilter: Filter =
    tempParam === 'hot' || tempParam === 'warm' || tempParam === 'cold' ? tempParam : 'all'
  const [filter, setFilter] = useState<Filter>(initialFilter)
  const [quickViewLead, setQuickViewLead] = useState<Lead | null>(null)

  const lockedCount = useMemo(
    () => leads.filter((l) => l.lockedBy === currentAgentId).length,
    [leads, currentAgentId],
  )
  const returnedCount = useMemo(() => leads.filter((l) => l.returnedToPool).length, [leads])

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      switch (filter) {
        case 'hot':
        case 'warm':
        case 'cold':
          return l.temperature === filter
        case 'today':
          return l.nextFollowupAt ? isToday(l.nextFollowupAt) : false
        case 'overdue':
          return l.nextFollowupAt
            ? !isToday(l.nextFollowupAt) && isOverdue(l.nextFollowupAt)
            : false
        default:
          return true
      }
    })
  }, [leads, filter])

  const call = (lead: Lead) => {
    if (!canCallLead(lead, currentAgentId)) return
    haptic('medium')
    startCall(lead.id)
    navigate(`/dialer/${lead.id}`)
  }

  const agentName = (id: string | null) => {
    const a = agents.find((x) => x.id === id)
    return a ? `${a.firstName} ${a.lastName}` : undefined
  }

  return (
    <Page>
      <ScreenHeader
        sticky
        title="سرنخ‌های من"
        subtitle={`${toFa(leads.length)} سرنخ فعال`}
        icon={Users}
        iconTone="secondary"
        className="pb-2"
      >
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto overflow-y-visible px-1 py-1.5 no-scrollbar">
          {filters.map((f) => {
            const Icon = f.icon
            return (
              <Chip
                key={f.id}
                active={filter === f.id}
                tone={f.tone}
                onClick={() => setFilter(f.id)}
                icon={Icon ? <Icon size={14} /> : undefined}
              >
                {f.label}
              </Chip>
            )
          })}
        </div>

        {(lockedCount > 0 || returnedCount > 0) && (
          <div className="mt-2.5 flex gap-2">
            {lockedCount > 0 && (
              <button
                onClick={() => navigate('/leads/locked')}
                className="flex flex-1 items-center gap-1.5 rounded-xl bg-error-50 px-3 py-2 text-[11px] font-extrabold text-error-600"
              >
                <Lock size={13} />
                {toFa(lockedCount)} لید قفل‌شده من
              </button>
            )}
            {returnedCount > 0 && (
              <button
                onClick={() => navigate('/leads/returned')}
                className="flex flex-1 items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-2 text-[11px] font-extrabold text-neutral-600"
              >
                <Undo2 size={13} />
                {toFa(returnedCount)} برگشت‌خورده
              </button>
            )}
          </div>
        )}
      </ScreenHeader>

      <div className="space-y-3 px-4 pt-3">
        {filtered.length === 0 ? (
          <EmptyState
            title="سرنخی پیدا نشد"
            description="فیلتر را تغییر بده."
            action={{ label: 'پاک کردن فیلترها', onClick: () => setFilter('all') }}
          />
        ) : (
          filtered.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => navigate(`/leads/${lead.id}`)}
              onCall={() => call(lead)}
              onQuickView={() => setQuickViewLead(lead)}
              lockedByName={
                lead.lockedBy && lead.lockedBy !== currentAgentId ? agentName(lead.lockedBy) : undefined
              }
            />
          ))
        )}
      </div>

      <LeadQuickViewSheet
        lead={quickViewLead}
        open={!!quickViewLead}
        onClose={() => setQuickViewLead(null)}
        onCall={call}
      />
    </Page>
  )
}
