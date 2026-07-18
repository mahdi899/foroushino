import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users,
  TrendingUp,
  ChevronLeft,
  Radio,
  FileText,
  Server,
  Layers3,
  UserPlus,
  ShieldCheck,
  Activity,
  BarChart3,
  Banknote,
  Landmark,
  WalletCards,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { AppHeader } from './AppHeader'
import { InsightCard } from '@/components/domain/InsightCard'
import { TeamMetricDetailSheet } from '@/components/domain/TeamMetricDetailSheet'
import { Avatar } from '@/components/ui/Avatar'
import {
  computeManagerInsights,
  computeSourcePerf,
  computeTeamRows,
  overdueFollowupsList,
  pendingConfirmationSales,
  weakAgents,
} from '@/lib/reportUtils'
import { getManagedTeam, getTeamAgentIds } from '@/lib/teamUtils'
import { isLeaderRole, isManagerRole, isSupervisorRole, isManagementRole } from '@/lib/roles'
import { hasPermission, canManageCatalog } from '@/lib/permissions'
import { roleLabels } from '@/data/labels'
import { conversionRateFromStats } from '@/lib/dailyGoal'
import { toFa } from '@/lib/format'
import { apiMode } from '@/services'
import { subscribeTeamLive } from '@/services/teamLivePoller'
import { haptic } from '@/lib/telegram'
import { countPendingCommissionsForLeader, countPendingCommissionsForSupervisor, resolveCommissionApprovalMode } from '@/lib/commissionQueue'
import {
  buildCallsBreakdown,
  buildConversionBreakdown,
  buildHotLeadsBreakdown,
  buildOverdueBreakdown,
  filterFollowupsForTeam,
  filterLeadsForTeam,
  type TeamMetricKind,
} from '@/lib/teamMetricBreakdown'
import { cn } from '@/lib/cn'
import type { Agent, Role } from '@/types'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'
const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: spring },
}
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.03 } },
}

type MenuItem = {
  id: string
  label: string
  sublabel?: string
  icon: LucideIcon
  onClick: () => void
  badge?: number
  tone?: 'default' | 'primary' | 'warning' | 'success'
  iconWrap?: 'primary' | 'success' | 'warning'
}

const iconWrapClass: Record<NonNullable<MenuItem['iconWrap']>, string> = {
  primary: 'icon-3d-primary',
  success: 'icon-3d-success',
  warning: 'icon-3d-warning',
}

function resolveIconWrap(item: MenuItem): string {
  if (item.iconWrap) return iconWrapClass[item.iconWrap]
  if (item.tone === 'success') return iconWrapClass.success
  if (item.tone === 'warning') return iconWrapClass.warning
  return iconWrapClass.primary
}

function StatCell({
  value,
  label,
  warn,
  accent,
  onClick,
}: {
  value: string | number
  label: string
  warn?: boolean
  accent?: 'blue' | 'green' | 'orange' | 'red'
  onClick?: () => void
}) {
  const accentRing =
    accent === 'green'
      ? 'border-emerald-500/20 bg-emerald-500/8'
      : accent === 'orange'
        ? 'border-orange-500/20 bg-orange-500/8'
        : accent === 'red'
          ? 'border-red-500/20 bg-red-500/8'
          : 'border-[#3390EC]/20 bg-[#3390EC]/8 dark:border-[#8774E1]/25 dark:bg-[#8774E1]/10'

  const body = (
    <>
      <span
        className={cn(
          'text-[18px] font-black tabular-nums leading-none',
          warn ? 'text-amber-600 dark:text-amber-400' : 'text-text',
        )}
      >
        {typeof value === 'number' ? toFa(value) : value}
      </span>
      <span className="mt-1 text-center text-[9px] font-bold leading-tight text-text-soft">{label}</span>
    </>
  )

  const className = cn(
    'glass-inset flex flex-col items-center rounded-[14px] border px-1.5 py-2.5',
    accentRing,
    warn && 'border-amber-500/30 bg-amber-500/10',
    onClick && 'cursor-pointer transition-transform active:scale-[0.97]',
  )

  if (!onClick) {
    return <div className={className}>{body}</div>
  }

  return (
    <button
      type="button"
      onClick={() => {
        haptic('selection')
        onClick()
      }}
      className={className}
    >
      {body}
    </button>
  )
}

function MgmtHeroBanner({
  role,
  hero,
  totalCalls,
  avgConversion,
  hotLeads,
  overdueCount,
  teamAgentsCount,
  teamsCount,
  inboxTotal,
  isLeader,
  isSupervisor,
  isManager,
  onMetricClick,
}: {
  role: Role
  hero: { title: string; sub: string }
  totalCalls: number
  avgConversion: number
  hotLeads: number
  overdueCount: number
  teamAgentsCount: number
  teamsCount: number
  inboxTotal: number
  isLeader: boolean
  isSupervisor: boolean
  isManager: boolean
  onMetricClick?: (kind: TeamMetricKind) => void
}) {
  const accentBar =
    isManager
      ? 'from-[#8774E1]/90 via-[#3390EC]/70 to-[#10A37F]/60'
      : isSupervisor
        ? 'from-[#3390EC]/90 via-[#10A37F]/70 to-[#FFB000]/50'
        : 'from-[#10A37F]/90 via-[#3390EC]/70 to-[#8774E1]/50'

  return (
    <motion.div
      variants={fadeUp}
      className="glass-card relative overflow-hidden rounded-[26px] border border-white/60 dark:border-white/10"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-6 h-36 w-36 rounded-full bg-[#3390EC]/18 blur-3xl" />
        <div className="absolute -bottom-10 -right-8 h-32 w-32 rounded-full bg-[#8774E1]/16 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-20 w-20 rounded-full bg-[#10A37F]/12 blur-2xl" />
        <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/15" />
      </div>

      <div className={cn('relative h-1 w-full bg-gradient-to-l', accentBar)} />

      <div className="relative px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 text-right">
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <span className="glass-inset inline-flex items-center rounded-full border border-white/55 px-2.5 py-1 text-[10px] font-bold text-text-soft dark:border-white/10">
                {roleLabels[role]}
              </span>
              <span className="text-[10px] font-semibold text-text-soft">
                {isLeader ? 'پنل لیدر' : isSupervisor ? 'پنل ناظر' : 'پنل مدیریت'}
              </span>
            </div>
            <h2 className="mt-2 truncate text-[22px] font-black leading-tight tracking-tight text-text">
              {hero.title}
            </h2>
            <p className="mt-1 text-[12px] font-medium text-text-soft">{hero.sub}</p>
          </div>

          <motion.span
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="glass-inset-success inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/25 px-2.5 py-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            لایو
          </motion.span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <StatCell
            value={totalCalls}
            label="تماس امروز"
            accent="blue"
            onClick={onMetricClick ? () => onMetricClick('calls') : undefined}
          />
          <StatCell
            value={`${toFa(avgConversion)}٪`}
            label="نرخ تبدیل"
            accent="green"
            onClick={onMetricClick ? () => onMetricClick('conversion') : undefined}
          />
          <StatCell
            value={hotLeads}
            label="لید داغ"
            accent="orange"
            onClick={onMetricClick ? () => onMetricClick('hot_leads') : undefined}
          />
          <StatCell
            value={overdueCount}
            label="عقب‌افتاده"
            warn={overdueCount > 0}
            accent={overdueCount > 0 ? 'red' : undefined}
            onClick={onMetricClick ? () => onMetricClick('overdue') : undefined}
          />
        </div>

        <div className="glass-inset mt-3 flex items-center justify-between gap-2 rounded-[16px] border border-white/50 px-3 py-2.5 dark:border-white/10">
          <div className="flex min-w-0 flex-1 items-center justify-around gap-1">
            {(isSupervisor || isManager) && (
              <div className="flex flex-col items-center px-1">
                <span className="text-[15px] font-black tabular-nums text-text">{toFa(teamsCount)}</span>
                <span className="text-[9px] font-bold text-text-soft">تیم</span>
              </div>
            )}
            <div className="flex flex-col items-center px-1">
              <span className="text-[15px] font-black tabular-nums text-text">{toFa(teamAgentsCount)}</span>
              <span className="text-[9px] font-bold text-text-soft">کارشناس</span>
            </div>
            <div className="flex flex-col items-center px-1">
              <span
                className={cn(
                  'text-[15px] font-black tabular-nums',
                  inboxTotal > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-text',
                )}
              >
                {toFa(inboxTotal)}
              </span>
              <span className="text-[9px] font-bold text-text-soft">اقدام</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function MgmtSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section variants={fadeUp}>
      <h2 className="mb-2 px-1 text-[12px] font-extrabold tracking-wide text-text-soft">{title}</h2>
      <div className="glass-card overflow-hidden rounded-[20px] border border-white/55 dark:border-white/10">
        {children}
      </div>
    </motion.section>
  )
}

function QuickActionTile({ item }: { item: MenuItem }) {
  const Icon = item.icon

  return (
    <button
      type="button"
      onClick={() => {
        haptic('selection')
        item.onClick()
      }}
      className="glass-inset group relative flex flex-col items-center gap-2.5 rounded-[18px] border border-white/50 p-3.5 text-center transition-all active:scale-[0.97] dark:border-white/10"
    >
      {item.badge != null && item.badge > 0 ? (
        <span className="absolute -top-1 -left-1 z-[1] flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-white shadow-md">
          {toFa(item.badge)}
        </span>
      ) : null}
      <span
        className={cn(
          'icon-3d flex h-11 w-11 items-center justify-center rounded-[14px] transition-transform group-active:scale-95',
          resolveIconWrap(item),
        )}
      >
        <Icon size={20} strokeWidth={2.25} className="text-white" />
      </span>
      <span className="line-clamp-2 text-[11px] font-bold leading-tight text-text">{item.label}</span>
    </button>
  )
}

function MgmtRow({
  item,
  bordered,
}: {
  item: MenuItem
  bordered?: boolean
}) {
  const Icon = item.icon

  return (
    <button
      type="button"
      onClick={() => {
        haptic('selection')
        item.onClick()
      }}
      className={cn(
        'group flex w-full items-center gap-3 px-3.5 py-3.5 text-right transition-colors active:bg-black/[0.03] dark:active:bg-white/[0.04]',
        bordered && 'border-b border-white/40 dark:border-white/8',
      )}
    >
      <span
        className={cn(
          'icon-3d flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] transition-transform group-active:scale-95',
          resolveIconWrap(item),
        )}
      >
        <Icon size={18} strokeWidth={2.25} className="text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-[14px] font-bold text-text">{item.label}</span>
        {item.sublabel && (
          <p className="mt-0.5 truncate text-[11px] font-medium text-text-soft">{item.sublabel}</p>
        )}
      </div>
      {item.badge != null && item.badge > 0 ? (
        <span className="shrink-0 rounded-full bg-gradient-to-b from-amber-400 to-amber-500 px-2.5 py-0.5 text-[10px] font-black tabular-nums text-white shadow-sm">
          {toFa(item.badge)}
        </span>
      ) : null}
      <ChevronLeft size={17} strokeWidth={2.25} className="shrink-0 text-[#C7C7CC] dark:text-[#48484A]" />
    </button>
  )
}

function InboxRow({
  label,
  count,
  onClick,
  bordered,
}: {
  label: string
  count: number
  onClick: () => void
  bordered?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic('selection')
        onClick()
      }}
      className={cn(
        'group flex w-full items-center gap-3 px-3.5 py-3.5 text-right transition-colors active:bg-amber-500/10',
        bordered && 'border-b border-amber-500/12 dark:border-amber-500/10',
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-amber-500/15">
        <AlertTriangle size={16} strokeWidth={2.25} className="text-amber-600 dark:text-amber-400" />
      </span>
      <span className="min-w-0 flex-1 text-[13px] font-bold text-text">{label}</span>
      <span className="shrink-0 rounded-full bg-gradient-to-b from-amber-400 to-orange-500 px-2.5 py-1 text-[11px] font-black tabular-nums text-white shadow-sm">
        {toFa(count)}
      </span>
      <ChevronLeft size={16} className="shrink-0 text-amber-600/50 transition-transform group-active:-translate-x-0.5" />
    </button>
  )
}

function AgentRankRow({
  agent,
  rank,
  bordered,
}: {
  agent: Agent
  rank: number
  bordered?: boolean
}) {
  const rankStyle =
    rank === 1
      ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-white shadow-sm'
      : rank === 2
        ? 'bg-gradient-to-b from-neutral-200 to-neutral-300 text-neutral-700'
        : rank === 3
          ? 'bg-gradient-to-b from-orange-300 to-orange-400 text-white shadow-sm'
          : 'bg-neutral-100 text-neutral-500 dark:bg-white/10 dark:text-neutral-400'

  const subline =
    agent.points > 0
      ? `${toFa(agent.points)} امتیاز`
      : agent.successfulToday > 0
        ? `${toFa(agent.successfulToday)} موفق · ${toFa(agent.conversionRate)}٪`
        : `${toFa(agent.conversionRate)}٪ تبدیل`

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-3.5 py-3',
        bordered && 'border-b border-white/40 dark:border-white/8',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black',
          rankStyle,
        )}
      >
        {toFa(rank)}
      </span>
      <Avatar id={agent.id} first={agent.firstName} last={agent.lastName} src={agent.avatar} size={36} />
      <div className="min-w-0 flex-1 text-right">
        <p className="truncate text-[13px] font-bold text-text">
          {agent.firstName} {agent.lastName}
        </p>
        <p className="text-[10px] font-semibold text-text-soft">{subline}</p>
      </div>
      <div className="shrink-0 text-left">
        <p className="text-[16px] font-black tabular-nums text-text">{toFa(agent.callsToday)}</p>
        <p className="text-[9px] font-semibold text-text-soft">تماس</p>
        {agent.successfulToday > 0 && (
          <p className="mt-0.5 text-[9px] font-bold tabular-nums text-emerald-600">
            {toFa(agent.successfulToday)} موفق
          </p>
        )}
      </div>
    </div>
  )
}

export function ManagementHome() {
  const navigate = useNavigate()
  const [metricSheet, setMetricSheet] = useState<TeamMetricKind | null>(null)
  const role = useStore((s) => s.role)
  const permissions = useStore((s) => s.permissions)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)
  const leads = useStore((s) => s.leads)
  const followups = useStore((s) => s.followups)
  const sales = useStore((s) => s.sales)
  const teamReports = useStore((s) => s.teamReports)
  const agentReports = useStore((s) => s.agentReports)
  const commissions = useStore((s) => s.commissions)
  const mergeTeamLiveStats = useStore((s) => s.mergeTeamLiveStats)

  const isLeader = isLeaderRole(role)
  const isSupervisor = isSupervisorRole(role)
  const isManager = isManagerRole(role)
  const canManageStaff = hasPermission(permissions, 'users.view')
  const canViewSystemActivity = hasPermission(permissions, 'reports.view-all')
  const canManageSettings = hasPermission(permissions, 'admin.settings')
  const canOpenCatalog = canManageCatalog(permissions)
  const canIntakeLeads =
    hasPermission(permissions, 'leads.manage') ||
    hasPermission(permissions, 'leads.import') ||
    hasPermission(permissions, 'leads.reassign')
  const canReviewPayment = hasPermission(permissions, 'sales.review-payment')
  const canApproveCommissionsLeader = hasPermission(permissions, 'commissions.approve-leader')
  const canApproveCommissionsSupervisor = hasPermission(permissions, 'commissions.approve-supervisor')

  const managedTeam = useMemo(
    () => getManagedTeam(teams, currentAgentId, role),
    [teams, currentAgentId, role],
  )

  useEffect(() => {
    if (apiMode !== 'http' || !isManagementRole(role)) return

    return subscribeTeamLive(managedTeam?.id ?? null, (live) => {
      mergeTeamLiveStats(live)
    })
  }, [role, managedTeam?.id, mergeTeamLiveStats])

  const teamAgentIds = getTeamAgentIds(teams, agents, currentAgentId, role)
  const teamAgents = agents.filter((a) => teamAgentIds.includes(a.id) && a.role === 'agent')
  const teamLeads = useMemo(() => filterLeadsForTeam(leads, teamAgentIds), [leads, teamAgentIds])
  const teamFollowups = useMemo(
    () => filterFollowupsForTeam(followups, teamAgentIds),
    [followups, teamAgentIds],
  )
  const totalCalls = teamAgents.reduce((sum, a) => sum + a.callsToday, 0)
  const totalSuccess = teamAgents.reduce((sum, a) => sum + a.successfulToday, 0)
  const avgConversion = conversionRateFromStats(totalCalls, totalSuccess)
  const hotLeads = teamLeads.filter((l) => l.temperature === 'hot').length

  const teamRows = useMemo(() => computeTeamRows(agents, teams), [agents, teams])
  const sourcePerf = useMemo(() => computeSourcePerf(leads), [leads])
  const weak = useMemo(() => weakAgents(agents), [agents])
  const overdue = useMemo(() => overdueFollowupsList(teamFollowups), [teamFollowups])
  const pendingSales = useMemo(() => pendingConfirmationSales(sales), [sales])
  const pendingTeamReports = useMemo(
    () => teamReports.filter((r) => r.status === 'submitted').length,
    [teamReports],
  )
  const pendingAgentReports = useMemo(
    () => agentReports.filter((r) => r.status === 'submitted' && teamAgentIds.includes(r.agentId)).length,
    [agentReports, teamAgentIds],
  )
  const managerInbox = useMemo(
    () => teamReports.filter((r) => r.status === 'forwarded_to_manager').length,
    [teamReports],
  )
  const paymentReviewCount = useMemo(
    () =>
      sales.filter(
        (sale) => sale.status === 'payment_submitted' && teamAgentIds.includes(sale.agentId),
      ).length,
    [sales, teamAgentIds],
  )
  const pendingSalesInScope = useMemo(
    () =>
      isLeader
        ? pendingSales.filter((sale) => teamAgentIds.includes(sale.agentId)).length
        : pendingSales.length,
    [isLeader, pendingSales, teamAgentIds],
  )

  const insights = useMemo(
    () =>
      computeManagerInsights({
        teamRows,
        sourcePerf,
        weak,
        overdueCount: overdue.length,
        pendingSales: pendingSales.length,
      }).slice(0, isSupervisor ? 2 : 3),
    [teamRows, sourcePerf, weak, overdue.length, pendingSales.length, isSupervisor],
  )

  const heroByRole: Record<string, { title: string; sub: string }> = {
    leader: { title: managedTeam?.name ?? 'تیم من', sub: `${toFa(teamAgents.length)} کارشناس فعال` },
    supervisor: { title: 'ناظر فروش', sub: `${toFa(teams.length)} تیم · کیفیت و pipeline` },
    manager: { title: 'مدیر فروش', sub: 'نظارت سازمان و گزارش‌ها' },
    admin: { title: 'مدیر فروش', sub: 'نظارت سازمان و گزارش‌ها' },
  }
  const hero = heroByRole[role] ?? heroByRole.leader
  const topAgents = [...teamAgents]
    .sort((a, b) => b.successfulToday - a.successfulToday || b.callsToday - a.callsToday)
    .slice(0, 3)

  const pendingCommissionCount = useMemo(() => {
    const mode = resolveCommissionApprovalMode(role, permissions)
    if (mode === 'leader') {
      return countPendingCommissionsForLeader(commissions, teams, agents, currentAgentId, role)
    }
    if (mode === 'supervisor') {
      return countPendingCommissionsForSupervisor(commissions)
    }
    return 0
  }, [
    commissions,
    teams,
    agents,
    currentAgentId,
    role,
    permissions,
  ])

  const inboxItems = useMemo(() => {
    const items: { id: string; label: string; count: number; onClick: () => void }[] = []

    if (isSupervisor && pendingTeamReports > 0) {
      items.push({
        id: 'team-reports',
        label: 'گزارش تیم منتظر تایید',
        count: pendingTeamReports,
        onClick: () => navigate('/team-reports?status=submitted'),
      })
    }
    if (isManager && managerInbox > 0) {
      items.push({
        id: 'manager-inbox',
        label: 'گزارش تایید‌شده از ناظر',
        count: managerInbox,
        onClick: () => navigate('/team-reports?inbox=1'),
      })
    }
    if (isLeader && pendingAgentReports > 0) {
      items.push({
        id: 'agent-reports',
        label: 'گزارش کارشناس منتظر تایید',
        count: pendingAgentReports,
        onClick: () => navigate('/agent-reports?inbox=1'),
      })
    }
    if (canReviewPayment && paymentReviewCount > 0) {
      items.push({
        id: 'payments',
        label: 'پرداخت منتظر تایید',
        count: paymentReviewCount,
        onClick: () => navigate('/sales?status=payment_submitted'),
      })
    }
    if (!isLeader && pendingSalesInScope > 0) {
      items.push({
        id: 'sales',
        label: 'فروش منتظر تایید',
        count: pendingSalesInScope,
        onClick: () => navigate('/sales'),
      })
    }
    if (pendingCommissionCount > 0) {
      items.push({
        id: 'commissions',
        label: isLeader ? 'پورسانت منتظر تایید لیدر' : 'پورسانت منتظر تایید نهایی',
        count: pendingCommissionCount,
        onClick: () => navigate('/wallet/approvals'),
      })
    }

    return items
  }, [
    isSupervisor,
    isManager,
    isLeader,
    pendingTeamReports,
    managerInbox,
    pendingAgentReports,
    canReviewPayment,
    paymentReviewCount,
    pendingSalesInScope,
    pendingCommissionCount,
    navigate,
  ])

  const teamMenu = useMemo((): MenuItem[] => {
    const items: MenuItem[] = []

    if (isLeader) {
      items.push(
        {
          id: 'team-live',
          label: 'تیم لایو',
          sublabel: 'وضعیت لحظه‌ای کارشناسان',
          icon: Radio,
          onClick: () => navigate('/team'),
          tone: 'primary',
        },
        {
          id: 'leads',
          label: 'مشتریان تیم',
          sublabel: `${toFa(leads.filter((l) => teamAgentIds.includes(l.assignedAgentId)).length)} مشتری`,
          icon: Users,
          onClick: () => navigate('/leads'),
        },
        {
          id: 'activity',
          label: 'فعالیت تیم',
          icon: Activity,
          onClick: () => navigate('/activity'),
        },
        {
          id: 'agent-reports',
          label: 'گزارش کارشناسان',
          sublabel: pendingAgentReports > 0 ? `${toFa(pendingAgentReports)} منتظر تایید` : undefined,
          icon: FileText,
          onClick: () => navigate('/agent-reports?inbox=1'),
          badge: pendingAgentReports,
        },
        {
          id: 'team-report',
          label: 'ارسال گزارش روزانه تیم',
          icon: FileText,
          onClick: () => navigate('/team-reports'),
        },
      )
    }

    if (isSupervisor || isManager) {
      items.push(
        {
          id: 'teams',
          label: isSupervisor ? 'تیم‌ها و لایو' : 'همه تیم‌ها',
          icon: Radio,
          onClick: () => navigate('/teams'),
          tone: 'primary',
        },
        { id: 'live-ops', label: 'عملیات زنده', icon: Activity, onClick: () => navigate('/live-ops') },
        { id: 'qa', label: 'کنترل کیفیت', icon: ShieldCheck, onClick: () => navigate('/qa') },
      )
      if (canIntakeLeads) {
        items.push({
          id: 'intake',
          label: 'ورود و تقسیم مشتری',
          icon: UserPlus,
          onClick: () => navigate('/leads/intake'),
        })
      }
    }

    if (isManager) {
      if (canOpenCatalog) {
        items.push({
          id: 'catalog',
          label: 'محصولات و منابع ورود',
          sublabel: 'دوره‌ها، لینک پیامک و منبع ورود',
          icon: Layers3,
          onClick: () => navigate('/admin/settings'),
        })
      }
      if (canManageSettings) {
        items.push({ id: 'settings', label: 'تنظیمات سیستم', icon: Server, onClick: () => navigate('/admin/settings') })
      }
      if (canManageStaff) {
        items.push({ id: 'staff', label: 'ناظران و لیدرها', icon: Users, onClick: () => navigate('/admin/staff') })
      }
      if (canViewSystemActivity) {
        items.push({
          id: 'sys-activity',
          label: 'فعالیت کل سیستم',
          icon: TrendingUp,
          onClick: () => navigate('/activity'),
          tone: 'primary',
        })
      }
    }

    return items
  }, [
    isLeader,
    isSupervisor,
    isManager,
    canIntakeLeads,
    canManageSettings,
    canOpenCatalog,
    canManageStaff,
    canViewSystemActivity,
    pendingAgentReports,
    leads,
    teamAgentIds,
    navigate,
  ])

  const financeMenu = useMemo((): MenuItem[] => {
    const items: MenuItem[] = []

    if (isLeader && canApproveCommissionsLeader) {
      items.push({
        id: 'comm-leader',
        label: 'تایید پورسانت (لیدر)',
        sublabel:
          pendingCommissionCount > 0
            ? `${toFa(pendingCommissionCount)} مورد — قبل از ناظر`
            : 'پورسانت کارشناسان تیم پس از تایید فروش',
        icon: WalletCards,
        onClick: () => navigate('/wallet/approvals'),
        tone: 'success',
        iconWrap: 'success',
        badge: pendingCommissionCount,
      })
    }
    if ((isSupervisor || isManager) && canApproveCommissionsSupervisor) {
      items.push({
        id: 'comm-supervisor',
        label: 'تایید نهایی پورسانت',
        sublabel:
          pendingCommissionCount > 0
            ? `${toFa(pendingCommissionCount)} مورد تایید‌شده توسط لیدر`
            : 'فقط پس از تایید لیدر تیم',
        icon: WalletCards,
        onClick: () => navigate('/wallet/approvals'),
        tone: 'success',
        iconWrap: 'success',
        badge: pendingCommissionCount,
      })
    }
    if (isSupervisor && hasPermission(permissions, 'wallet.manage-payouts')) {
      items.push({
        id: 'payouts',
        label: 'صف تسویه',
        sublabel: 'پرداخت به کارشناسان — کارت و شبا',
        icon: Banknote,
        onClick: () => navigate('/wallet/payouts'),
        tone: 'success',
        iconWrap: 'success',
      })
    }
    if (canManageStaff && hasPermission(permissions, 'users.manage-team')) {
      items.push({
        id: 'bank',
        label: 'تایید کارت و شبا',
        icon: Landmark,
        onClick: () => navigate('/wallet/bank-accounts'),
        tone: 'warning',
        iconWrap: 'warning',
      })
      items.push({
        id: 'agents',
        label: 'مدیریت کارشناسان',
        icon: UserPlus,
        onClick: () => navigate('/admin/agents'),
        iconWrap: 'primary',
      })
    }
    if (canManageStaff && hasPermission(permissions, 'teams.manage')) {
      items.push({
        id: 'teams-admin',
        label: 'مدیریت تیم‌ها',
        icon: Users,
        onClick: () => navigate('/admin/teams'),
        iconWrap: 'primary',
      })
    }

    return items
  }, [
    isLeader,
    isSupervisor,
    isManager,
    canManageStaff,
    canApproveCommissionsLeader,
    canApproveCommissionsSupervisor,
    permissions,
    pendingCommissionCount,
    navigate,
  ])

  const inboxTotal = useMemo(
    () => inboxItems.reduce((sum, item) => sum + item.count, 0),
    [inboxItems],
  )

  const quickActions = useMemo(
    () => teamMenu.filter((item) => ['teams', 'live-ops', 'qa', 'team-live', 'intake'].includes(item.id)),
    [teamMenu],
  )
  const listMenu = useMemo(
    () => teamMenu.filter((item) => !quickActions.some((q) => q.id === item.id)),
    [teamMenu, quickActions],
  )

  const metricRows = useMemo(() => {
    if (!metricSheet) return []
    switch (metricSheet) {
      case 'calls':
        return buildCallsBreakdown(teamAgents)
      case 'conversion':
        return buildConversionBreakdown(teamAgents)
      case 'hot_leads':
        return buildHotLeadsBreakdown(leads, teamAgents, teamAgentIds)
      case 'overdue':
        return buildOverdueBreakdown(followups, leads, teamAgents, teamAgentIds)
      default:
        return []
    }
  }, [metricSheet, teamAgents, leads, followups, teamAgentIds])

  return (
    <Page>
      <AppHeader />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-4 px-4 pt-2 pb-2"
      >
        <MgmtHeroBanner
          role={role}
          hero={hero}
          totalCalls={totalCalls}
          avgConversion={avgConversion}
          hotLeads={hotLeads}
          overdueCount={overdue.length}
          teamAgentsCount={teamAgents.length}
          teamsCount={teams.length}
          inboxTotal={inboxTotal}
          isLeader={isLeader}
          isSupervisor={isSupervisor}
          isManager={isManager}
          onMetricClick={setMetricSheet}
        />

        <TeamMetricDetailSheet
          open={metricSheet != null}
          kind={metricSheet}
          rows={metricRows}
          onClose={() => setMetricSheet(null)}
        />

        {inboxItems.length > 0 && (
          <MgmtSection title="نیاز به اقدام">
            {inboxItems.map((item, i) => (
              <InboxRow
                key={item.id}
                label={item.label}
                count={item.count}
                onClick={item.onClick}
                bordered={i < inboxItems.length - 1}
              />
            ))}
          </MgmtSection>
        )}

        {quickActions.length > 0 && (
          <motion.section variants={fadeUp}>
            <h2 className="mb-2 px-1 text-[12px] font-extrabold tracking-wide text-text-soft">
              {isLeader ? 'میانبرهای تیم' : 'دسترسی سریع'}
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((item) => (
                <QuickActionTile key={item.id} item={item} />
              ))}
            </div>
          </motion.section>
        )}

        {listMenu.length > 0 && (
          <MgmtSection title={isLeader ? 'مدیریت تیم' : 'عملیات و تنظیمات'}>
            {listMenu.map((item, i) => (
              <MgmtRow key={item.id} item={item} bordered={i < listMenu.length - 1} />
            ))}
          </MgmtSection>
        )}

        {financeMenu.length > 0 && (
          <MgmtSection title="مالی و پرسنل">
            {financeMenu.map((item, i) => (
              <MgmtRow key={item.id} item={item} bordered={i < financeMenu.length - 1} />
            ))}
          </MgmtSection>
        )}

        {(isManager || isSupervisor) && teamRows.length > 0 && (
          <motion.section variants={fadeUp}>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-[12px] font-extrabold tracking-wide text-text-soft">روند تیم‌ها</h2>
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className={cn('text-[11px] font-bold', TG)}
              >
                گزارش کامل
              </button>
            </div>
            <div className="-mx-0.5 flex gap-2.5 overflow-x-auto px-0.5 pb-0.5 no-scrollbar">
              {teamRows.map((team) => (
                <motion.div
                  key={team.id}
                  whileTap={{ scale: 0.97 }}
                  className="glass-card relative min-w-[130px] shrink-0 overflow-hidden rounded-[18px] border border-white/55 p-3.5 dark:border-white/10"
                >
                  <div className="pointer-events-none absolute -right-4 -top-4 h-14 w-14 rounded-full bg-[#3390EC]/12 blur-xl" />
                  <p className="relative truncate text-[11px] font-bold text-text-soft">{team.name}</p>
                  <p className={cn('relative mt-2 text-[22px] font-black tabular-nums leading-none', TG)}>
                    {toFa(team.conversion)}٪
                  </p>
                  <p className="relative mt-1 text-[9px] font-semibold text-text-soft">نرخ تبدیل</p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {isLeader && topAgents.length > 0 && (
          <MgmtSection title="برترین‌های امروز">
            {topAgents.map((agent, index) => (
              <AgentRankRow
                key={agent.id}
                agent={agent}
                rank={index + 1}
                bordered={index < topAgents.length - 1}
              />
            ))}
          </MgmtSection>
        )}

        {insights.length > 0 && (
          <motion.section variants={fadeUp} className="space-y-2">
            <h2 className="flex items-center gap-1.5 px-1 text-[12px] font-extrabold tracking-wide text-text-soft">
              <TrendingUp size={12} className={TG} />
              بینش‌های امروز
            </h2>
            {insights.map((ins) => (
              <InsightCard key={ins.id} tone={ins.tone} title={ins.title} body={ins.body} />
            ))}
          </motion.section>
        )}

        {weak.length > 0 && !isSupervisor && (
          <MgmtSection title="نیازمند بررسی">
            {weak.slice(0, 3).map((agent, index, arr) => (
              <AgentRankRow
                key={agent.id}
                agent={agent}
                rank={index + 1}
                bordered={index < arr.length - 1}
              />
            ))}
          </MgmtSection>
        )}

        <MgmtSection title="گزارش‌ها">
          <MgmtRow
            item={{
              id: 'reports',
              label: 'گزارش‌ها و آمار',
              sublabel: 'عملکرد تیم، منبع لید و روند',
              icon: BarChart3,
              onClick: () => navigate('/reports'),
              tone: 'primary',
            }}
          />
        </MgmtSection>
      </motion.div>
    </Page>
  )
}
