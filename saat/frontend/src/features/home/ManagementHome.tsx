import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users,
  TrendingUp,
  ChevronLeft,
  BadgeDollarSign,
  Radio,
  FileText,
  Server,
  UserPlus,
  ShieldCheck,
  Activity,
  CreditCard,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { AppHeader } from './AppHeader'
import { InsightCard } from '@/components/domain/InsightCard'
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
import { hasPermission } from '@/lib/permissions'
import { roleLabels } from '@/data/labels'
import { conversionRateFromStats } from '@/lib/dailyGoal'
import { toFa } from '@/lib/format'
import { apiMode } from '@/services'
import { fetchTeamLive } from '@/services/teamLive'
import { haptic } from '@/lib/telegram'
import { countPendingCommissionsForLeader, countPendingCommissionsForSupervisor } from '@/lib/commissionQueue'
import { cn } from '@/lib/cn'
import type { Agent } from '@/types'

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
}

function StatCell({ value, label, warn }: { value: string | number; label: string; warn?: boolean }) {
  return (
    <div className="flex flex-col items-center px-1.5 py-3">
      <span
        className={cn(
          'text-[17px] font-black tabular-nums leading-none',
          warn ? 'text-amber-600 dark:text-amber-400' : 'text-text',
        )}
      >
        {typeof value === 'number' ? toFa(value) : value}
      </span>
      <span className="mt-1 text-center text-[10px] font-semibold leading-tight text-text-soft">{label}</span>
    </div>
  )
}

function MgmtSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section variants={fadeUp}>
      <h2 className="mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wide text-text-soft">
        {title}
      </h2>
      <div className="glass-card overflow-hidden rounded-[18px] border border-white/55 dark:border-white/10">
        {children}
      </div>
    </motion.section>
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
  const iconTone =
    item.tone === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : item.tone === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : item.tone === 'primary'
          ? TG
          : TG

  return (
    <button
      type="button"
      onClick={() => {
        haptic('selection')
        item.onClick()
      }}
      className={cn(
        'flex w-full items-center gap-3 px-3.5 py-3 text-right transition-colors active:bg-black/[0.03] dark:active:bg-white/[0.04]',
        bordered && 'border-b border-white/40 dark:border-white/8',
      )}
    >
      <span className="glass-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/50 dark:border-white/10">
        <Icon size={17} strokeWidth={2.25} className={iconTone} />
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-[14px] font-semibold text-text">{item.label}</span>
        {item.sublabel && (
          <p className="mt-0.5 truncate text-[11px] font-medium text-text-soft">{item.sublabel}</p>
        )}
      </div>
      {item.badge != null && item.badge > 0 ? (
        <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black tabular-nums text-white">
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
        'flex w-full items-center gap-3 px-3.5 py-3 text-right transition-colors active:bg-amber-500/8',
        bordered && 'border-b border-amber-500/12 dark:border-amber-500/10',
      )}
    >
      <span className="min-w-0 flex-1 text-[13px] font-semibold text-text">{label}</span>
      <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black tabular-nums text-amber-700 dark:text-amber-300">
        {toFa(count)}
      </span>
      <ChevronLeft size={16} className="shrink-0 text-amber-600/50" />
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
      ? 'bg-warning-400 text-white'
      : rank === 2
        ? 'bg-neutral-300 text-neutral-700'
        : rank === 3
          ? 'bg-accent-400 text-white'
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
        'flex items-center gap-2.5 px-3.5 py-2.5',
        bordered && 'border-b border-white/40 dark:border-white/8',
      )}
    >
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black',
          rankStyle,
        )}
      >
        {toFa(rank)}
      </span>
      <Avatar id={agent.id} first={agent.firstName} last={agent.lastName} src={agent.avatar} size={34} />
      <div className="min-w-0 flex-1 text-right">
        <p className="truncate text-[13px] font-bold text-text">
          {agent.firstName} {agent.lastName}
        </p>
        <p className="text-[10px] font-semibold text-text-soft">{subline}</p>
      </div>
      <div className="shrink-0 text-left">
        <p className="text-[15px] font-black tabular-nums text-text">{toFa(agent.callsToday)}</p>
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

    const refresh = async () => {
      try {
        const live = await fetchTeamLive(managedTeam?.id ?? null)
        mergeTeamLiveStats(live)
      } catch {
        // Keep last synced snapshot.
      }
    }

    void refresh()
    const timer = window.setInterval(() => void refresh(), 15_000)
    return () => window.clearInterval(timer)
  }, [role, managedTeam?.id, mergeTeamLiveStats])

  const teamAgentIds = getTeamAgentIds(teams, agents, currentAgentId, role)
  const teamAgents = agents.filter((a) => teamAgentIds.includes(a.id) && a.role === 'agent')
  const totalCalls = teamAgents.reduce((sum, a) => sum + a.callsToday, 0)
  const totalSuccess = teamAgents.reduce((sum, a) => sum + a.successfulToday, 0)
  const avgConversion = conversionRateFromStats(totalCalls, totalSuccess)
  const hotLeads = leads.filter((l) => l.temperature === 'hot').length

  const teamRows = useMemo(() => computeTeamRows(agents, teams), [agents, teams])
  const sourcePerf = useMemo(() => computeSourcePerf(leads), [leads])
  const weak = useMemo(() => weakAgents(agents), [agents])
  const overdue = useMemo(() => overdueFollowupsList(followups), [followups])
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
    if (isLeader && canApproveCommissionsLeader) {
      return countPendingCommissionsForLeader(commissions, teams, agents, currentAgentId, role)
    }
    if (isSupervisor && canApproveCommissionsSupervisor) {
      return countPendingCommissionsForSupervisor(commissions, role)
    }
    return 0
  }, [
    commissions,
    teams,
    agents,
    currentAgentId,
    role,
    isLeader,
    isSupervisor,
    canApproveCommissionsLeader,
    canApproveCommissionsSupervisor,
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
        label: isLeader ? 'پورسانت منتظر تایید' : 'پورسانت منتظر تایید نهایی',
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
        label: 'تایید پورسانت',
        sublabel:
          pendingCommissionCount > 0
            ? `${toFa(pendingCommissionCount)} مورد منتظر تایید`
            : 'کمیسیون کارشناسان تیم',
        icon: BadgeDollarSign,
        onClick: () => navigate('/wallet/approvals'),
        tone: 'success',
        badge: pendingCommissionCount,
      })
    }
    if (isSupervisor && canApproveCommissionsSupervisor) {
      items.push({
        id: 'comm-supervisor',
        label: 'تایید نهایی پورسانت',
        icon: BadgeDollarSign,
        onClick: () => navigate('/wallet/approvals'),
        tone: 'success',
      })
    }
    if (isSupervisor && hasPermission(permissions, 'wallet.manage-payouts')) {
      items.push({
        id: 'payouts',
        label: 'صف تسویه',
        icon: BadgeDollarSign,
        onClick: () => navigate('/wallet/payouts'),
        tone: 'success',
      })
    }
    if (canManageStaff && hasPermission(permissions, 'users.manage-team')) {
      items.push({
        id: 'bank',
        label: 'تایید کارت و شبا',
        icon: CreditCard,
        onClick: () => navigate('/wallet/bank-accounts'),
        tone: 'warning',
      })
      items.push({
        id: 'agents',
        label: 'مدیریت کارشناسان',
        icon: UserPlus,
        onClick: () => navigate('/admin/agents'),
      })
    }
    if (canManageStaff && hasPermission(permissions, 'teams.manage')) {
      items.push({
        id: 'teams-admin',
        label: 'مدیریت تیم‌ها',
        icon: Users,
        onClick: () => navigate('/admin/teams'),
      })
    }

    return items
  }, [
    isLeader,
    isSupervisor,
    canManageStaff,
    canApproveCommissionsLeader,
    canApproveCommissionsSupervisor,
    permissions,
    pendingCommissionCount,
    navigate,
  ])

  return (
    <Page>
      <AppHeader />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-3 px-4 pt-2 pb-2"
      >
        {/* Team snapshot */}
        <motion.div
          variants={fadeUp}
          className="glass-card overflow-hidden rounded-[18px] border border-white/55 dark:border-white/10"
        >
          <div className="px-3.5 pb-3 pt-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 text-right">
                <span className="inline-flex items-center rounded-full border border-white/50 bg-white/40 px-2 py-0.5 text-[10px] font-bold text-text-soft dark:border-white/10 dark:bg-white/[0.06]">
                  {roleLabels[role]}
                </span>
                <h2 className="mt-1.5 truncate text-[18px] font-bold leading-tight text-text">{hero.title}</h2>
                <p className="mt-0.5 text-[11px] font-medium text-text-soft">{hero.sub}</p>
              </div>
              <span className="glass-inset inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                لایو
              </span>
            </div>

            <div className="glass-inset mt-3 overflow-hidden rounded-[14px] border border-white/50 dark:border-white/10">
              <div className="grid grid-cols-4 divide-x divide-white/40 dark:divide-white/8">
                <StatCell value={totalCalls} label="تماس" />
                <StatCell value={`${toFa(avgConversion)}٪`} label="تبدیل" />
                <StatCell value={hotLeads} label="داغ" />
                <StatCell value={overdue.length} label="عقب‌افتاده" warn={overdue.length > 0} />
              </div>
            </div>
          </div>
        </motion.div>

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

        {teamMenu.length > 0 && (
          <MgmtSection title={isLeader ? 'مدیریت تیم' : 'دسترسی سریع'}>
            {teamMenu.map((item, i) => (
              <MgmtRow key={item.id} item={item} bordered={i < teamMenu.length - 1} />
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
            <div className="mb-1.5 flex items-center justify-between px-1">
              <h2 className="text-[11px] font-extrabold uppercase tracking-wide text-text-soft">
                روند تیم‌ها
              </h2>
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className={cn('text-[11px] font-bold', TG)}
              >
                گزارش کامل
              </button>
            </div>
            <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-0.5 no-scrollbar">
              {teamRows.map((team) => (
                <div
                  key={team.id}
                  className="glass-card min-w-[120px] shrink-0 rounded-[16px] border border-white/55 p-3 dark:border-white/10"
                >
                  <p className="truncate text-[11px] font-bold text-text-soft">{team.name}</p>
                  <p className={cn('mt-1.5 text-[20px] font-black tabular-nums leading-none', TG)}>
                    {toFa(team.conversion)}٪
                  </p>
                  <p className="mt-1 text-[9px] font-semibold text-text-soft">نرخ تبدیل</p>
                </div>
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
            <h2 className="flex items-center gap-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wide text-text-soft">
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
