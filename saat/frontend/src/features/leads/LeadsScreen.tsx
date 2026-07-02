import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Flame, Sun, Snowflake, CalendarClock, AlertTriangle } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { LeadCard } from '@/components/domain/LeadCard'
import { EmptyState } from '@/components/ui/States'
import { isToday, isOverdue, toFa } from '@/lib/format'
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
  const startCall = useStore((s) => s.startCall)
  const [filter, setFilter] = useState<Filter>('all')

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
    haptic('medium')
    startCall(lead.id)
    navigate(`/dialer/${lead.id}`)
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
            />
          ))
        )}
      </div>
    </Page>
  )
}
