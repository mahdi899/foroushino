import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users,
  TrendingUp,
  ArrowLeft,
  BadgeDollarSign,
  TriangleAlert,
  Radio,
  FileText,
  Server,
  UserPlus,
  ShieldCheck,
  Activity,
  CreditCard,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { AppHeader } from './AppHeader'
import { InsightCard } from '@/components/domain/InsightCard'
import { LeaderboardRow } from '@/components/domain/LeaderboardRow'
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
import { cn } from '@/lib/cn'

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

type HomeAction = {
  id: string
  label: string
  icon: LucideIcon
  onClick: () => void
  badge?: number
  tone?: 'default' | 'primary' | 'warning' | 'success'
  span?: 1 | 2
}

function HeroStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p className="text-[18px] font-black tabular-nums leading-none text-text">{typeof value === 'number' ? toFa(value) : value}</p>
      <p className="mt-1 truncate text-[10px] font-semibold text-text-soft">{label}</p>
    </div>
  )
}

function InboxPanel({
  items,
}: {
  items: { id: string; label: string; count: number; onClick: () => void }[]
}) {
  if (items.length === 0) return null

  const total = items.reduce((sum, item) => sum + item.count, 0)

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="overflow-hidden rounded-[20px] border border-amber-500/25 bg-amber-500/8"
    >
      <div className="flex items-center justify-between gap-2 border-b border-amber-500/15 px-3.5 py-2.5">
        <p className="text-[12px] font-extrabold text-amber-800 dark:text-amber-200">نیاز به اقدام</p>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black tabular-nums text-amber-700 dark:text-amber-300">
          {toFa(total)}
        </span>
      </div>
      <ul className="divide-y divide-amber-500/10">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={item.onClick}
              className="flex w-full items-center gap-2 px-3.5 py-3 text-right transition-colors active:bg-amber-500/10"
            >
              <span className="min-w-0 flex-1 text-[12px] font-bold text-text">{item.label}</span>
              <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black tabular-nums text-amber-800 dark:text-amber-200">
                {toFa(item.count)}
              </span>
              <ArrowLeft size={14} className="shrink-0 text-amber-600/60" />
            </button>
          </li>
        ))}
      </ul>
    </motion.section>
  )
}

function ActionGrid({ title, items }: { title: string; items: HomeAction[] }) {
  if (items.length === 0) return null

  return (
    <section>
      <h2 className="mb-2.5 px-0.5 text-[13px] font-extrabold text-text-muted">{title}</h2>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = item.icon
          const toneClass =
            item.tone === 'primary'
              ? 'border-primary-500/20 bg-primary-500/8'
              : item.tone === 'success'
                ? 'border-emerald-500/20 bg-emerald-500/8'
                : item.tone === 'warning'
                  ? 'border-amber-500/20 bg-amber-500/8'
                  : 'border-border/60 bg-surface/80'

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={cn(
                'glass-inset relative flex min-h-[72px] flex-col items-start justify-between rounded-[16px] border p-3 text-right',
                toneClass,
                item.span === 2 && 'col-span-2 min-h-0 flex-row items-center gap-2.5',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]',
                  item.tone === 'success'
                    ? 'bg-emerald-500/15 text-emerald-600'
                    : item.tone === 'warning'
                      ? 'bg-amber-500/15 text-amber-600'
                      : item.tone === 'primary'
                        ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400'
                        : 'bg-neutral-500/10 text-text-muted',
                )}
              >
                <Icon size={16} strokeWidth={2.25} />
              </span>
              <span className={cn('text-[11px] font-bold leading-snug text-text', item.span === 2 && 'flex-1')}>
                {item.label}
              </span>
              {item.badge != null && item.badge > 0 && (
                <span className="absolute left-2.5 top-2.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-black tabular-nums text-white">
                  {toFa(item.badge)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
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
    leader: { title: managedTeam?.name ?? 'تیم من', sub: 'عملکرد امروز تیم' },
    supervisor: { title: 'داشبورد ناظر', sub: `${toFa(teams.length)} تیم · کیفیت و pipeline` },
    manager: { title: 'داشبورد مدیر', sub: 'نظارت سازمان و گزارش‌ها' },
    admin: { title: 'داشبورد مدیر', sub: 'نظارت سازمان و گزارش‌ها' },
  }
  const hero = heroByRole[role] ?? heroByRole.leader
  const topAgents = [...teamAgents].sort((a, b) => b.callsToday - a.callsToday).slice(0, 3)

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
    navigate,
  ])

  const primaryActions = useMemo((): HomeAction[] => {
    const items: HomeAction[] = []

    if (isLeader) {
      items.push(
        { id: 'team-live', label: 'تیم لایو', icon: Radio, onClick: () => navigate('/team'), tone: 'primary' },
        { id: 'leads', label: 'مشتریان تیم', icon: Users, onClick: () => navigate('/leads') },
        { id: 'activity', label: 'فعالیت تیم', icon: Activity, onClick: () => navigate('/activity') },
        {
          id: 'agent-reports',
          label: 'گزارش کارشناسان',
          icon: FileText,
          onClick: () => navigate('/agent-reports?inbox=1'),
          badge: pendingAgentReports,
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
          span: 2,
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

    if (isLeader) {
      items.push({
        id: 'team-report',
        label: 'ارسال گزارش روزانه تیم',
        icon: FileText,
        onClick: () => navigate('/team-reports'),
        span: 2,
      })
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
    navigate,
  ])

  const financeActions = useMemo((): HomeAction[] => {
    const items: HomeAction[] = []

    if (isLeader && canApproveCommissionsLeader) {
      items.push({
        id: 'comm-leader',
        label: 'تایید پورسانت',
        icon: BadgeDollarSign,
        onClick: () => navigate('/wallet/approvals'),
        tone: 'success',
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
        id: 'teams',
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
    navigate,
  ])

  return (
    <Page>
      <AppHeader />

      <div className="space-y-4 px-4 pt-2 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="glass-hero relative overflow-hidden rounded-[24px] p-4"
        >
          <div className="pointer-events-none absolute -left-8 -top-10 h-32 w-32 rounded-full bg-primary-500/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full border border-border/50 bg-surface/60 px-2.5 py-0.5 text-[10px] font-bold text-text-soft">
                {roleLabels[role]}
              </span>
              <h2 className="mt-2 truncate text-[20px] font-black leading-tight text-text">{hero.title}</h2>
              <p className="mt-0.5 text-[11px] font-semibold text-text-soft">{hero.sub}</p>
            </div>
            <span className="glass-inset inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold text-text-muted">
              <Radio size={11} className="text-emerald-500" />
              لایو
            </span>
          </div>

          <div className="relative mt-4 flex items-center gap-1 rounded-[16px] border border-border/50 bg-surface/50 px-1 py-2">
            <HeroStat value={totalCalls} label="تماس" />
            <div className="h-7 w-px shrink-0 bg-border/60" />
            <HeroStat value={`${toFa(avgConversion)}٪`} label="تبدیل" />
            <div className="h-7 w-px shrink-0 bg-border/60" />
            <HeroStat value={hotLeads} label="داغ" />
            <div className="h-7 w-px shrink-0 bg-border/60" />
            <HeroStat value={overdue.length} label="عقب‌افتاده" />
          </div>
        </motion.div>

        <InboxPanel items={inboxItems} />

        <ActionGrid title="دسترسی سریع" items={primaryActions} />
        {financeActions.length > 0 && <ActionGrid title="مالی و پرسنل" items={financeActions} />}

        {(isManager || isSupervisor) && teamRows.length > 0 && (
          <section>
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <h2 className="text-[13px] font-extrabold text-text-muted">روند تیم‌ها</h2>
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="text-[11px] font-bold text-primary-600 dark:text-primary-400"
              >
                گزارش کامل
              </button>
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
              {teamRows.map((team) => (
                <div
                  key={team.id}
                  className="glass-card min-w-[132px] shrink-0 rounded-[16px] border border-white/55 p-3 dark:border-white/10"
                >
                  <p className="truncate text-[12px] font-extrabold text-text">{team.name}</p>
                  <p className="mt-2 text-[20px] font-black tabular-nums text-primary-600 dark:text-primary-400">
                    {toFa(team.conversion)}٪
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-text-soft">نرخ تبدیل</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {isLeader && topAgents.length > 0 && (
          <section>
            <h2 className="mb-2.5 px-0.5 text-[13px] font-extrabold text-text-muted">برترین‌های امروز</h2>
            <div className="space-y-2">
              {topAgents.map((agent, index) => (
                <LeaderboardRow key={agent.id} agent={agent} rank={index + 1} metric={agent.callsToday} />
              ))}
            </div>
          </section>
        )}

        {insights.length > 0 && (
          <section>
            <h2 className="mb-2.5 flex items-center gap-1.5 px-0.5 text-[13px] font-extrabold text-text-muted">
              <TrendingUp size={14} className="text-primary-500" />
              بینش‌های امروز
            </h2>
            <div className="space-y-2">
              {insights.map((ins) => (
                <InsightCard key={ins.id} tone={ins.tone} title={ins.title} body={ins.body} />
              ))}
            </div>
          </section>
        )}

        {weak.length > 0 && !isSupervisor && (
          <section>
            <h2 className="mb-2.5 flex items-center gap-1.5 px-0.5 text-[13px] font-extrabold text-text-muted">
              <TriangleAlert size={14} className="text-warning-500" />
              نیازمند بررسی
            </h2>
            <div className="space-y-2">
              {weak.slice(0, 3).map((agent, index) => (
                <LeaderboardRow key={agent.id} agent={agent} rank={index + 1} metric={agent.callsToday} />
              ))}
            </div>
          </section>
        )}

        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="flex w-full items-center justify-center gap-1.5 rounded-[16px] border border-border/60 bg-surface py-3 text-[13px] font-extrabold text-primary-700 dark:text-primary-300"
        >
          گزارش‌ها و آمار
          <ArrowLeft size={15} />
        </button>
      </div>
    </Page>
  )
}
