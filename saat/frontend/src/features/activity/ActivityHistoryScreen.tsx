import { useMemo, useState } from 'react'
import {
  Phone,
  ClipboardCheck,
  CalendarClock,
  BadgeDollarSign,
  Wallet,
  ArrowUpCircle,
  Users,
  History,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/States'
import { formatJalaliDate, relativeDayTime } from '@/lib/format'
import { hasPermission } from '@/lib/permissions'
import { agentById } from '@/lib/teamUtils'
import type { ActivityKind } from '@/types'
import { cn } from '@/lib/cn'

const kindConfig: Record<ActivityKind, { icon: LucideIcon; bg: string; fg: string; label: string }> = {
  call: { icon: Phone, bg: 'bg-primary-50', fg: 'text-primary-600', label: 'تماس' },
  result: { icon: ClipboardCheck, bg: 'bg-secondary-50', fg: 'text-secondary-600', label: 'نتیجه' },
  follow_up: { icon: CalendarClock, bg: 'bg-warning-50', fg: 'text-warning-600', label: 'پیگیری' },
  sale: { icon: BadgeDollarSign, bg: 'bg-success-50', fg: 'text-success-600', label: 'فروش' },
  payment: { icon: Wallet, bg: 'bg-success-50', fg: 'text-success-600', label: 'پرداخت' },
  commission: { icon: Wallet, bg: 'bg-success-50', fg: 'text-success-600', label: 'پورسانت' },
  shift: { icon: History, bg: 'bg-cold-50', fg: 'text-cold-600', label: 'شیفت' },
  lead: { icon: Users, bg: 'bg-hot-50', fg: 'text-hot-600', label: 'مشتری' },
  payout: { icon: ArrowUpCircle, bg: 'bg-primary-50', fg: 'text-primary-600', label: 'تسویه' },
}

type Filter = 'all' | ActivityKind

export function ActivityHistoryScreen() {
  const permissions = useStore((s) => s.permissions)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const agents = useStore((s) => s.agents)
  const allActivity = useStore((s) => s.activity)
  const systemWide = hasPermission(permissions, 'reports.view-all')
  const activity = useMemo(
    () => (systemWide ? allActivity : allActivity.filter((a) => a.agentId === currentAgentId)),
    [allActivity, currentAgentId, systemWide],
  )
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(
    () => (filter === 'all' ? activity : activity.filter((a) => a.kind === filter)),
    [activity, filter],
  )

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const a of filtered) {
      const key = formatJalaliDate(new Date(a.createdAt))
      const list = map.get(key) ?? []
      list.push(a)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [filtered])

  const availableKinds = Array.from(new Set(activity.map((a) => a.kind)))

  return (
    <Page withNav={false}>
      <TopBar
        title={systemWide ? 'فعالیت کل سیستم' : 'تاریخچه فعالیت'}
        subtitle={systemWide ? 'همه رویدادهای ثبت‌شده در سات' : 'همه فعالیت‌های ثبت‌شده تو'}
      />

      <div className="px-4">
        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 py-0.5 no-scrollbar">
          <Chip active={filter === 'all'} tone="primary" onClick={() => setFilter('all')}>
            همه
          </Chip>
          {availableKinds.map((k) => (
            <Chip key={k} active={filter === k} tone="primary" onClick={() => setFilter(k)}>
              {kindConfig[k].label}
            </Chip>
          ))}
        </div>

        {groups.length === 0 ? (
          <EmptyState icon={<History size={32} />} title="فعالیتی ثبت نشده" />
        ) : (
          <div className="space-y-5">
            {groups.map(([date, items]) => (
              <div key={date}>
                <h2 className="mb-2.5 px-1 text-[11px] font-extrabold text-neutral-400">{date}</h2>
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-card">
                  {items.map((a, i) => {
                    const cfg = kindConfig[a.kind]
                    return (
                      <div
                        key={a.id}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3.5',
                          i < items.length - 1 && 'border-b border-border/60',
                        )}
                      >
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', cfg.bg, cfg.fg)}>
                          <cfg.icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-extrabold text-neutral-900">{a.title}</p>
                          {systemWide && (
                            <p className="mt-0.5 truncate text-[10px] font-bold text-neutral-400">
                              {(() => {
                                const actor = agentById(agents, a.agentId)
                                return actor ? `${actor.firstName} ${actor.lastName}` : 'سیستم'
                              })()}
                            </p>
                          )}
                          {a.meta && <p className="mt-0.5 truncate text-[11px] font-bold text-neutral-400">{a.meta}</p>}
                        </div>
                        <span className="shrink-0 text-[10px] font-bold text-neutral-300">
                          {relativeDayTime(a.createdAt).split('،')[1]?.trim()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  )
}
