import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Users, Flame, Sun, Snowflake, CalendarClock, AlertTriangle, Lock, Undo2, UserPlus } from 'lucide-react'
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
import { isManagementRole } from '@/lib/roles'
import { haptic } from '@/lib/telegram'
import type { Lead } from '@/types'
import { DataGate } from '@/components/pwa/DataGate'

type Filter = 'all' | 'hot' | 'warm' | 'cold' | 'today' | 'overdue'

const filters: { id: Filter; label: string; icon?: typeof Flame; tone: ChipTone }[] = [
  { id: 'all', label: 'همه', tone: 'neutral' },
  { id: 'hot', label: 'خیلی جدی', icon: Flame, tone: 'hot' },
  { id: 'warm', label: 'علاقه‌مند', icon: Sun, tone: 'warm' },
  { id: 'cold', label: 'کم‌علاقه', icon: Snowflake, tone: 'cold' },
  { id: 'today', label: 'پیگیری امروز', icon: CalendarClock, tone: 'primary' },
  { id: 'overdue', label: 'عقب‌افتاده', icon: AlertTriangle, tone: 'error' },
]

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

  const visibleLeads = useMemo(
    () =>
      isTeamViewer
        ? filterLeadsForScope(leads, teams, agents, currentAgentId, role)
        : filterLeadsForAgent(leads, currentAgentId),
    [leads, teams, agents, currentAgentId, role, isTeamViewer],
  )

  const lockedCount = useMemo(
    () => (isTeamViewer ? 0 : visibleLeads.filter((l) => l.lockedBy === currentAgentId).length),
    [visibleLeads, currentAgentId, isTeamViewer],
  )
  const returnedCount = useMemo(
    () => (isTeamViewer ? 0 : visibleLeads.filter((l) => l.returnedToPool).length),
    [visibleLeads, isTeamViewer],
  )

  const filtered = useMemo(() => {
    return visibleLeads.filter((l) => {
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
  }, [visibleLeads, filter])

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
        title={isTeamViewer ? 'مشتریان تیم' : 'مشتریان من'}
        subtitle={`${toFa(visibleLeads.length)} مشتری فعال`}
        icon={Users}
        iconTone="secondary"
      >
        <div className="-mx-1 flex gap-2 overflow-x-auto overflow-y-visible px-1 py-1 no-scrollbar">
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

        {canIntakeLeads && (
          <button
            type="button"
            onClick={() => navigate('/leads/intake')}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-3 py-2.5 text-[12px] font-extrabold text-white"
          >
            <UserPlus size={14} />
            ورود و تقسیم مشتری
          </button>
        )}

        {(lockedCount > 0 || returnedCount > 0) && (
          <div className="mt-2 flex gap-2">
            {lockedCount > 0 && (
              <button
                onClick={() => navigate('/leads/locked')}
                className="glass-inset flex flex-1 items-center gap-1.5 rounded-2xl border-error-200/60 px-3 py-2.5 text-[12px] font-semibold text-error-600 dark:border-error-500/20"
              >
                <Lock size={14} strokeWidth={2.25} />
                {toFa(lockedCount)} مشتری قفل‌شده من
              </button>
            )}
            {returnedCount > 0 && (
              <button
                onClick={() => navigate('/leads/returned')}
                className="glass-inset flex flex-1 items-center gap-1.5 rounded-2xl px-3 py-2.5 text-[12px] font-semibold text-[#8E8E93] dark:text-[#98989D]"
              >
                <Undo2 size={14} strokeWidth={2.25} />
                {toFa(returnedCount)} برگشت‌خورده
              </button>
            )}
          </div>
        )}
      </ScreenHeader>

      <DataGate mode="placeholder">
      <div className="space-y-2 px-4 pt-2 pb-1">
        {filtered.length === 0 ? (
          <EmptyState
            title="مشتری پیدا نشد"
            description="فیلتر را تغییر بده."
            action={{ label: 'پاک کردن فیلترها', onClick: () => setFilter('all') }}
          />
        ) : (
          filtered.map((lead) => (
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
          ))
        )}
      </div>
      </DataGate>

      <LeadQuickViewSheet
        lead={quickViewLead}
        open={!!quickViewLead}
        onClose={() => setQuickViewLead(null)}
        onCall={isTeamViewer ? undefined : call}
      />
    </Page>
  )
}
