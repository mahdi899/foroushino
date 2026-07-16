import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Flame, Sun, Snowflake, CalendarClock, AlertTriangle, Lock, Undo2, UserPlus } from 'lucide-react'
import { hasPermission } from '@/lib/permissions'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { LeadCard } from '@/components/domain/LeadCard'
import { LeadQuickViewSheet } from '@/components/domain/LeadQuickViewSheet'
import { EmptyState } from '@/components/ui/States'
import { isToday, isOverdue, toFa } from '@/lib/format'
import { canCallLead, filterLeadsForAgent, assignedAgentLabel as resolveAssignedAgentLabel } from '@/lib/leadUtils'
import { filterLeadsForScope } from '@/lib/teamUtils'
import { isManagementRole, isSupervisorRole } from '@/lib/roles'
import { haptic } from '@/lib/telegram'
import type { Lead } from '@/types'
import { useRemoteDataReady } from '@/providers/SyncProvider'
import { cn } from '@/lib/cn'

type Filter = 'all' | 'hot' | 'warm' | 'cold' | 'today' | 'overdue'

const filters: { id: Filter; label: string; icon?: typeof Flame; tone: ChipTone }[] = [
  { id: 'all', label: 'همه', tone: 'neutral' },
  { id: 'hot', label: 'خیلی جدی', icon: Flame, tone: 'hot' },
  { id: 'warm', label: 'علاقه‌مند', icon: Sun, tone: 'warm' },
  { id: 'cold', label: 'کم‌علاقه', icon: Snowflake, tone: 'cold' },
  { id: 'today', label: 'امروز', icon: CalendarClock, tone: 'primary' },
  { id: 'overdue', label: 'عقب‌افتاده', icon: AlertTriangle, tone: 'error' },
]

function matchesFilter(lead: Lead, filter: Filter): boolean {
  switch (filter) {
    case 'hot':
    case 'warm':
    case 'cold':
      return lead.temperature === filter
    case 'today':
      return lead.nextFollowupAt ? isToday(lead.nextFollowupAt) : false
    case 'overdue':
      return lead.nextFollowupAt
        ? !isToday(lead.nextFollowupAt) && isOverdue(lead.nextFollowupAt)
        : false
    default:
      return true
  }
}

export function LeadsScreen() {
  const navigate = useNavigate()
  const role = useStore((s) => s.role)
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)
  const leads = useStore((s) => s.leads)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const openCallMethodSheet = useStore((s) => s.openCallMethodSheet)
  const isTeamViewer = isManagementRole(role)
  const permissions = useStore((s) => s.permissions)
  const canIntakeLeads =
    hasPermission(permissions, 'leads.manage') ||
    hasPermission(permissions, 'leads.import') ||
    hasPermission(permissions, 'leads.reassign')
  const [searchParams] = useSearchParams()
  const tempParam = searchParams.get('temp')
  const initialFilter: Filter =
    tempParam === 'hot' || tempParam === 'warm' || tempParam === 'cold' ? tempParam : 'all'
  const [filter, setFilter] = useState<Filter>(initialFilter)
  const [quickViewLead, setQuickViewLead] = useState<Lead | null>(null)
  const { showData, syncing } = useRemoteDataReady()
  const showLeadList = showData || leads.length > 0 || !syncing || isTeamViewer

  const visibleLeads = useMemo(
    () =>
      isTeamViewer
        ? filterLeadsForScope(leads, teams, agents, currentAgentId, role)
        : filterLeadsForAgent(leads, currentAgentId),
    [leads, teams, agents, currentAgentId, role, isTeamViewer],
  )

  const filterCounts = useMemo(() => {
    const counts = {} as Record<Filter, number>
    for (const f of filters) {
      counts[f.id] = visibleLeads.filter((lead) => matchesFilter(lead, f.id)).length
    }
    return counts
  }, [visibleLeads])

  const lockedCount = useMemo(
    () => (isTeamViewer ? 0 : visibleLeads.filter((l) => l.lockedBy === currentAgentId).length),
    [visibleLeads, currentAgentId, isTeamViewer],
  )
  const returnedCount = useMemo(
    () => (isTeamViewer ? 0 : visibleLeads.filter((l) => l.returnedToPool).length),
    [visibleLeads, isTeamViewer],
  )

  const filtered = useMemo(
    () => visibleLeads.filter((lead) => matchesFilter(lead, filter)),
    [visibleLeads, filter],
  )

  const call = (lead: Lead) => {
    if (isTeamViewer || !canCallLead(lead, currentAgentId)) return
    haptic('medium')
    openCallMethodSheet(lead)
  }

  return (
    <Page>
      <ScreenHeader
        sticky
        subtitleInline
        title={isTeamViewer ? (isSupervisorRole(role) ? 'مشتریان تیم من' : 'مشتریان تیم') : 'مشتریان من'}
        subtitle={`${toFa(visibleLeads.length)} فعال`}
        className="pb-1"
      >
        <div className="glass-inset -mx-0.5 overflow-hidden rounded-[16px] border border-white/50 p-1 dark:border-white/10">
          <div className="-mx-0.5 flex gap-1.5 overflow-x-auto overflow-y-visible px-0.5 py-0.5 no-scrollbar">
            {filters.map((f) => {
              const Icon = f.icon
              const count = filterCounts[f.id]
              return (
                <Chip
                  key={f.id}
                  active={filter === f.id}
                  tone={f.tone}
                  onClick={() => setFilter(f.id)}
                  icon={Icon ? <Icon size={13} /> : undefined}
                  className="h-8 px-3 text-[12px]"
                >
                  {f.label}
                  {count > 0 && f.id !== 'all' && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[9px] tabular-nums',
                        filter === f.id ? 'bg-white/25' : 'bg-black/[0.06] dark:bg-white/10',
                      )}
                    >
                      {toFa(count)}
                    </span>
                  )}
                </Chip>
              )
            })}
          </div>
        </div>

        {(canIntakeLeads || lockedCount > 0 || returnedCount > 0) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {canIntakeLeads && (
              <button
                type="button"
                onClick={() => navigate('/leads/intake')}
                className="glass-inset inline-flex items-center gap-1.5 rounded-full border border-[#3390EC]/20 px-3 py-1.5 text-[11px] font-bold text-[#3390EC] dark:border-[#8774E1]/25 dark:text-[#8774E1]"
              >
                <UserPlus size={13} strokeWidth={2.35} />
                ورود مشتری
              </button>
            )}
            {lockedCount > 0 && (
              <button
                type="button"
                onClick={() => navigate('/leads/locked')}
                className="glass-inset inline-flex items-center gap-1.5 rounded-full border border-error-300/50 px-3 py-1.5 text-[11px] font-bold text-error-600 dark:border-error-500/25"
              >
                <Lock size={13} strokeWidth={2.35} />
                قفل‌شده {toFa(lockedCount)}
              </button>
            )}
            {returnedCount > 0 && (
              <button
                type="button"
                onClick={() => navigate('/leads/returned')}
                className="glass-inset inline-flex items-center gap-1.5 rounded-full border border-white/50 px-3 py-1.5 text-[11px] font-bold text-text-soft dark:border-white/10"
              >
                <Undo2 size={13} strokeWidth={2.35} />
                برگشت‌خورده {toFa(returnedCount)}
              </button>
            )}
          </div>
        )}
      </ScreenHeader>

      {!showLeadList ? (
        <div className="mx-4 mt-2 rounded-[20px] border border-border/60 bg-surface-soft px-4 py-8 text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="text-sm font-semibold text-text">در حال دریافت مشتریان…</p>
        </div>
      ) : (
        <div className="px-4 pt-2 pb-1">
          {filtered.length === 0 ? (
            <EmptyState
              title="مشتری پیدا نشد"
              description="فیلتر را تغییر بده."
              action={{ label: 'پاک کردن فیلترها', onClick: () => setFilter('all') }}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-2"
            >
              <p className="px-0.5 text-[11px] font-semibold text-text-soft">
                {toFa(filtered.length)} مشتری
                {filter !== 'all' && ` · ${filters.find((f) => f.id === filter)?.label}`}
              </p>
              {filtered.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  assignedAgentLabel={
                    isTeamViewer
                      ? resolveAssignedAgentLabel(lead, agents) ?? 'بدون کارشناس'
                      : undefined
                  }
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  onCall={isTeamViewer ? undefined : () => call(lead)}
                  onQuickView={() => setQuickViewLead(lead)}
                />
              ))}
            </motion.div>
          )}
        </div>
      )}

      <LeadQuickViewSheet
        lead={quickViewLead}
        open={!!quickViewLead}
        onClose={() => setQuickViewLead(null)}
        onCall={isTeamViewer ? undefined : call}
      />
    </Page>
  )
}
