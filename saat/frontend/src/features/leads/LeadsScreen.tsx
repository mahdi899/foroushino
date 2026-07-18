import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Undo2, UserPlus } from 'lucide-react'
import { hasPermission } from '@/lib/permissions'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { LeadFilterBar, type LeadFilterItem } from '@/components/domain/LeadFilterBar'
import type { LeadFilterId } from '@/components/domain/LeadFilterIcons'
import { LeadCard } from '@/components/domain/LeadCard'
import { LeadQuickViewSheet } from '@/components/domain/LeadQuickViewSheet'
import { EmptyState } from '@/components/ui/States'
import { isToday, isOverdue, toFa } from '@/lib/format'
import { canCallLead, filterLeadsForAgent, assignedAgentLabel as resolveAssignedAgentLabel } from '@/lib/leadUtils'
import { filterLeadsForScope } from '@/lib/teamUtils'
import { isManagementRole, isSupervisorRole } from '@/lib/roles'
import { BRAND_SOFT } from '@/lib/brand'
import { haptic } from '@/lib/telegram'
import type { Lead } from '@/types'
import { useRemoteDataReady } from '@/providers/SyncProvider'
import { cn } from '@/lib/cn'

type Filter = LeadFilterId

const filters: LeadFilterItem[] = [
  { id: 'all', label: 'همه' },
  { id: 'hot', label: 'خیلی جدی' },
  { id: 'warm', label: 'علاقه‌مند' },
  { id: 'cold', label: 'کم‌علاقه' },
  { id: 'today', label: 'امروز' },
  { id: 'overdue', label: 'عقب‌افتاده' },
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
    const counts: Record<Filter, number> = {
      all: visibleLeads.length,
      hot: 0,
      warm: 0,
      cold: 0,
      today: 0,
      overdue: 0,
    }

    for (const lead of visibleLeads) {
      if (lead.temperature === 'hot') counts.hot++
      else if (lead.temperature === 'warm') counts.warm++
      else if (lead.temperature === 'cold') counts.cold++

      if (lead.nextFollowupAt) {
        if (isToday(lead.nextFollowupAt)) counts.today++
        else if (isOverdue(lead.nextFollowupAt)) counts.overdue++
      }
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
        <LeadFilterBar
          filters={filters}
          active={filter}
          counts={filterCounts}
          onChange={setFilter}
        />

        {(canIntakeLeads || lockedCount > 0 || returnedCount > 0) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {canIntakeLeads && (
              <button
                type="button"
                onClick={() => navigate('/leads/intake')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold active:scale-[0.96]',
                  BRAND_SOFT,
                )}
              >
                <UserPlus size={13} strokeWidth={2.35} />
                ورود مشتری
              </button>
            )}
            {lockedCount > 0 && (
              <button
                type="button"
                onClick={() => navigate('/leads/locked')}
                className="inline-flex items-center gap-1.5 rounded-full border border-error-300/50 bg-error-500/8 px-3 py-1.5 text-[11px] font-bold text-error-600 active:scale-[0.96] dark:border-error-500/25 dark:bg-error-500/10"
              >
                <Lock size={13} strokeWidth={2.35} />
                قفل‌شده {toFa(lockedCount)}
              </button>
            )}
            {returnedCount > 0 && (
              <button
                type="button"
                onClick={() => navigate('/leads/returned')}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-black/[0.04] px-3 py-1.5 text-[11px] font-bold text-text-soft active:scale-[0.96] dark:border-white/10 dark:bg-white/[0.06]"
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
            <div className="space-y-2">
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
            </div>
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
