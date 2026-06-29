import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Flame, Sun, Snowflake, CalendarClock, AlertTriangle } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { Chip } from '@/components/ui/Chip'
import { LeadCard } from '@/components/domain/LeadCard'
import { EmptyState } from '@/components/ui/States'
import { isToday, isOverdue, toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import type { Lead } from '@/types'

type Filter = 'all' | 'hot' | 'warm' | 'cold' | 'today' | 'overdue'

const filters: { id: Filter; label: string; icon?: typeof Flame }[] = [
  { id: 'all', label: 'همه' },
  { id: 'hot', label: 'داغ', icon: Flame },
  { id: 'warm', label: 'گرم', icon: Sun },
  { id: 'cold', label: 'سرد', icon: Snowflake },
  { id: 'today', label: 'پیگیری امروز', icon: CalendarClock },
  { id: 'overdue', label: 'عقب‌افتاده', icon: AlertTriangle },
]

export function LeadsScreen() {
  const navigate = useNavigate()
  const leads = useStore((s) => s.leads)
  const startCall = useStore((s) => s.startCall)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (query) {
        const q = query.trim()
        const hay = `${l.firstName} ${l.lastName} ${l.phone} ${l.city}`
        if (!hay.includes(q)) return false
      }
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
  }, [leads, query, filter])

  const call = (lead: Lead) => {
    haptic('medium')
    startCall(lead.id)
    navigate(`/dialer/${lead.id}`)
  }

  return (
    <Page>
      <div className="sticky top-0 z-20 bg-background/85 glass px-4 pt-[calc(14px+var(--safe-top))] pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-neutral-900">سرنخ‌های من</h1>
            <p className="text-[11px] font-bold text-neutral-400">{toFa(leads.length)} سرنخ فعال</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <Users size={20} />
          </div>
        </div>

        <div className="mt-3 flex h-12 items-center gap-2 rounded-2xl border border-border bg-surface px-3.5">
          <Search size={18} className="text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو بر اساس نام، شماره یا شهر"
            className="h-full flex-1 bg-transparent text-sm font-bold text-neutral-900 outline-none placeholder:text-neutral-300"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {filters.map((f) => {
            const Icon = f.icon
            return (
              <Chip
                key={f.id}
                active={filter === f.id}
                onClick={() => setFilter(f.id)}
                icon={Icon ? <Icon size={14} /> : undefined}
              >
                {f.label}
              </Chip>
            )
          })}
        </div>
      </div>

      <div className="space-y-3 px-4 pt-3">
        {filtered.length === 0 ? (
          <EmptyState
            title="سرنخی پیدا نشد"
            description="فیلتر یا عبارت جستجو را تغییر بده."
            action={{ label: 'پاک کردن فیلترها', onClick: () => { setFilter('all'); setQuery('') } }}
          />
        ) : (
          filtered.map((lead, i) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              index={i}
              onClick={() => navigate(`/leads/${lead.id}`)}
              onCall={() => call(lead)}
            />
          ))
        )}
      </div>
    </Page>
  )
}
