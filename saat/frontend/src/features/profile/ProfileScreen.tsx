import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Settings,
  Bell,
  ChevronLeft,
  LogOut,
  Flame,
  Target,
  HelpCircle,
  ShieldCheck,
  Activity,
  BadgeDollarSign,
  WalletCards,
  GraduationCap,
  History,
  Layers3,
  Server,
  Users,
  BarChart3,
  CreditCard,
  type LucideIcon,
} from 'lucide-react'
import { isAgentRole, isManagementRole } from '@/lib/roles'
import { hasPermission, canManageCatalog } from '@/lib/permissions'
import { useStore } from '@/store/useStore'
import { apiMode } from '@/services'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { ProfileAvatarPicker } from '@/features/profile/ProfileAvatarPicker'
import { TeamDailyLeaderboard } from '@/components/domain/TeamDailyLeaderboard'
import { AgentCodeBadge } from '@/components/domain/AgentCodeBadge'
import { roleLabels } from '@/data/labels'
import { getTeamAgentIds } from '@/lib/teamUtils'
import { conversionRateFromStats } from '@/lib/dailyGoal'
import { getAgentTeamPeers } from '@/lib/dailyTopPerformers'
import { useDailyTopRank } from '@/hooks/useDailyTopRank'
import { toFa } from '@/lib/format'
import { APP_VERSION_LABEL } from '@/lib/app'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'
const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: spring },
}
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}

interface MenuItem {
  icon: LucideIcon
  label: string
  sublabel?: string
  onClick: () => void
}

export function ProfileScreen() {
  const navigate = useNavigate()
  const role = useStore((s) => s.role)
  const permissions = useStore((s) => s.permissions)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const logout = useStore((s) => s.logout)
  const pushToast = useStore((s) => s.pushToast)
  const dataReady = useStore((s) => s.dataReady)
  const dataSyncing = useStore((s) => s.dataSyncing)

  const agentLine = isAgentRole(role)
  const management = isManagementRole(role)
  const canOpenAdminSettings = hasPermission(permissions, 'admin.settings')
  const canOpenCatalog = canManageCatalog(permissions)
  const reportsPath = management ? '/reports' : '/performance'
  const goalPct =
    agent && agent.callGoal > 0
      ? Math.min(100, Math.round((agent.callsToday / agent.callGoal) * 100))
      : 0
  const goalComplete =
    agentLine && !!agent && agent.callGoal > 0 && agent.callsToday >= agent.callGoal

  const dailyTopRank = useDailyTopRank(agent?.id)

  const teamLeaderboard = useMemo(() => {
    if (!agent || !agentLine || !agent.teamId) return null
    const peers = getAgentTeamPeers(agent, agents, teams, currentAgentId, role)
    if (peers.length === 0) return null
    const team = teams.find((item) => item.id === agent.teamId)
    return { teamName: team?.name ?? 'تیم من', peers }
  }, [agentLine, agent, agents, teams, currentAgentId, role])

  const profileStats = useMemo(() => {
    if (!agent) {
      return [
        { label: 'تماس امروز', value: toFa(0) },
        { label: 'موفق امروز', value: toFa(0) },
        { label: 'نرخ تبدیل', value: `${toFa(0)}٪` },
      ]
    }

    if (management) {
      const teamAgentIds = getTeamAgentIds(teams, agents, currentAgentId, role)
      const teamAgents = agents.filter(
        (member) => teamAgentIds.includes(member.id) && member.role === 'agent',
      )
      const calls = teamAgents.reduce((sum, member) => sum + member.callsToday, 0)
      const successful = teamAgents.reduce((sum, member) => sum + member.successfulToday, 0)
      const conversion = conversionRateFromStats(calls, successful)

      return [
        { label: 'تماس تیم', value: toFa(calls) },
        { label: 'موفق تیم', value: toFa(successful) },
        { label: 'نرخ تبدیل', value: `${toFa(conversion)}٪` },
      ]
    }

    const calls = agent.callsToday
    const successful = agent.successfulToday
    const conversion =
      agent.conversionRate > 0
        ? agent.conversionRate
        : conversionRateFromStats(calls, successful)

    return [
      { label: 'تماس امروز', value: toFa(calls) },
      { label: 'موفق امروز', value: toFa(successful) },
      { label: 'نرخ تبدیل', value: `${toFa(conversion)}٪` },
    ]
  }, [management, teams, agents, currentAgentId, role, agent])

  if (!agent) {
    if (apiMode === 'http' && (!dataReady || dataSyncing)) {
      return (
        <Page>
          <TopBar title="پروفایل" showBack={false} />
          <div className="flex justify-center py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        </Page>
      )
    }
    return null
  }

  const workMenu: MenuItem[] = [
    ...(agentLine
      ? [{ icon: Activity, label: 'وضعیت کاری', sublabel: 'آماده، استراحت، پیگیری', onClick: () => navigate('/work-status') }]
      : []),
    {
      icon: BarChart3,
      label: 'گزارش‌ها',
      sublabel: management ? 'عملکرد تیم و آمار کلی' : 'عملکرد، دستاوردها و لیدربورد',
      onClick: () => navigate(reportsPath),
    },
    { icon: BadgeDollarSign, label: management ? 'فروش‌ها' : 'فروش‌های من', onClick: () => navigate('/sales') },
    ...(agentLine
      ? [{ icon: WalletCards, label: 'درآمد من', sublabel: 'کمیسیون و برداشت', onClick: () => navigate('/wallet') }]
      : []),
    ...(agentLine
      ? [{ icon: GraduationCap, label: 'آموزش و اسکریپت', sublabel: 'پاسخ به اعتراضات', onClick: () => navigate('/training') }]
      : []),
  ]

  const accountMenu: MenuItem[] = [
    { icon: Bell, label: 'اعلان‌ها', onClick: () => navigate('/notifications') },
    {
      icon: History,
      label: management && hasPermission(permissions, 'reports.view-all') ? 'فعالیت سیستم' : 'تاریخچه فعالیت',
      onClick: () => navigate('/activity'),
    },
    { icon: Settings, label: 'تنظیمات', onClick: () => navigate('/settings') },
  ]

  const supportMenu: MenuItem[] = [
    { icon: ShieldCheck, label: 'حریم خصوصی', onClick: () => navigate('/settings') },
    { icon: HelpCircle, label: 'راهنما و پشتیبانی', onClick: () => navigate('/settings') },
  ]

  const adminMenu: MenuItem[] = [
    ...(hasPermission(permissions, 'users.manage-team') || hasPermission(permissions, 'users.manage')
      ? [
          ...(hasPermission(permissions, 'teams.manage')
            ? [{ icon: Users, label: 'مدیریت تیم‌ها', onClick: () => navigate('/admin/teams') }]
            : []),
          { icon: CreditCard, label: 'تایید کارت و شبا', onClick: () => navigate('/wallet/bank-accounts') },
          { icon: Users, label: 'مدیریت کارشناسان', onClick: () => navigate('/admin/agents') },
        ]
      : []),
    ...(canOpenCatalog
      ? [{ icon: Layers3, label: 'محصولات و منابع ورود', sublabel: 'تعریف دوره‌ها و منبع ورود مشتری', onClick: () => navigate('/admin/catalog') }]
      : []),
    ...(canOpenAdminSettings || hasPermission(permissions, 'users.manage')
      ? [
          ...(hasPermission(permissions, 'users.manage')
            ? [{ icon: Users, label: 'مدیریت ناظران', onClick: () => navigate('/admin/staff') }]
            : []),
          ...(canOpenAdminSettings
            ? [{ icon: Server, label: 'تنظیمات سیستم', onClick: () => navigate('/admin/settings') }]
            : []),
        ]
      : []),
  ]

  return (
    <Page>
      <TopBar title="پروفایل" showBack={false} />

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 px-4 pb-2 pt-2">
        {/* Profile hero */}
        <motion.div
          variants={fadeUp}
          className="glass-card relative overflow-visible rounded-[22px] border border-white/55 dark:border-white/10"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/12" />

          <div className="px-4 pb-4 pt-5">
            <div className={cn('flex flex-col items-center', dailyTopRank === 1 && 'pt-2')}>
              <ProfileAvatarPicker
                id={agent.id}
                first={agent.firstName}
                last={agent.lastName}
                src={agent.avatar}
                dailyTopRank={dailyTopRank}
              />
              <h2 className="mt-3 text-[20px] font-bold tracking-tight text-text">
                {agent.firstName} {agent.lastName}
              </h2>
              <p className="mt-0.5 text-[13px] font-medium text-text-soft">{roleLabels[agent.role]}</p>

              {agent.agentCode > 0 && (
                <div className="mt-2">
                  <AgentCodeBadge
                    code={agent.agentCode}
                    onCopied={(msg) => pushToast(msg)}
                    onCopyError={(msg) => pushToast(msg, 'error')}
                  />
                </div>
              )}

              {agentLine && (agent.streak > 0 || agent.points > 0) && (
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                  {agent.streak > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-bold text-orange-600 dark:text-orange-300">
                      <Flame size={11} strokeWidth={2.35} />
                      {toFa(agent.streak)} روز
                    </span>
                  )}
                  {agent.points > 0 && (
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold', 'border-[#3390EC]/18 bg-[#3390EC]/10 dark:border-[#8774E1]/22 dark:bg-[#8774E1]/12', TG)}>
                      {toFa(agent.points)} امتیاز
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Today stats — compact telegram row */}
            <div className="glass-inset mt-4 overflow-hidden rounded-[14px] border border-white/50 dark:border-white/10">
              <div className="grid grid-cols-3 divide-x divide-white/40 dark:divide-white/8">
                {profileStats.map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center px-2 py-3">
                    <span className="text-[17px] font-black tabular-nums leading-none text-text">
                      {stat.value}
                    </span>
                    <span className="mt-1 text-center text-[10px] font-semibold leading-tight text-text-soft">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {agentLine && agent.callGoal > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                  <span className="flex items-center gap-1 text-text-soft">
                    <Target size={12} className={goalComplete ? 'text-emerald-500' : TG} strokeWidth={2.35} />
                    هدف تماس امروز
                  </span>
                  <span className="tabular-nums text-text">
                    {toFa(agent.callsToday)}
                    <span className="text-text-soft"> / </span>
                    {toFa(agent.callGoal)}
                  </span>
                </div>
                <div className="h-[5px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      goalComplete
                        ? 'bg-gradient-to-l from-emerald-500 to-emerald-400'
                        : 'bg-gradient-to-l from-[#3390EC] to-[#5EB0FF] dark:from-[#8774E1] dark:to-[#A894EE]',
                    )}
                    initial={false}
                    animate={{ width: `${goalPct}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {teamLeaderboard && (
          <motion.div variants={fadeUp}>
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <h2 className="min-w-0 truncate text-[12px] font-bold text-text-soft">
                {teamLeaderboard.teamName} · {toFa(teamLeaderboard.peers.length)} عضو
              </h2>
              <button
                type="button"
                onClick={() => {
                  haptic('selection')
                  navigate('/performance')
                }}
                className={cn('inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold', TG)}
              >
                برترین‌های تیم
                <ChevronLeft size={14} strokeWidth={2.25} />
              </button>
            </div>
            <div className="glass-card overflow-hidden rounded-[22px] border border-white/55 p-3 dark:border-white/10">
              <TeamDailyLeaderboard
                peers={teamLeaderboard.peers}
                meId={agent.id}
                variant="compact"
                embedded
              />
            </div>
          </motion.div>
        )}

        <ProfileSection title="کار من">
          {workMenu.map((item, i) => (
            <ProfileRow key={item.label} item={item} bordered={i < workMenu.length - 1} />
          ))}
        </ProfileSection>

        <ProfileSection title="حساب">
          {accountMenu.map((item, i) => (
            <ProfileRow key={item.label} item={item} bordered={i < accountMenu.length - 1} />
          ))}
        </ProfileSection>

        {adminMenu.length > 0 && (
          <ProfileSection title="مدیریت">
            {adminMenu.map((item, i) => (
              <ProfileRow key={item.label} item={item} bordered={i < adminMenu.length - 1} />
            ))}
          </ProfileSection>
        )}

        <ProfileSection title="پشتیبانی">
          {supportMenu.map((item, i) => (
            <ProfileRow key={item.label} item={item} bordered={i < supportMenu.length - 1} />
          ))}
        </ProfileSection>

        <motion.button
          variants={fadeUp}
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          className="glass-inset flex w-full items-center justify-center gap-2 rounded-[22px] border border-error-200/60 py-3.5 text-sm font-bold text-error-600 dark:border-error-500/25"
        >
          <LogOut size={18} strokeWidth={2.35} />
          خروج از حساب
        </motion.button>

        <motion.p variants={fadeUp} className="pb-2 text-center text-[11px] font-medium text-text-soft">
          {APP_VERSION_LABEL}
        </motion.p>
      </motion.div>
    </Page>
  )
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div variants={fadeUp}>
      <h2 className="mb-2 px-1 text-[12px] font-bold text-text-soft">{title}</h2>
      <div className="glass-card overflow-hidden rounded-[22px] border border-white/55 dark:border-white/10">
        {children}
      </div>
    </motion.div>
  )
}

function ProfileRow({ item, bordered }: { item: MenuItem; bordered?: boolean }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={() => {
        haptic('selection')
        item.onClick()
      }}
      className={cn(
        'flex w-full items-center gap-3 px-3.5 py-3.5 text-right transition-colors active:bg-black/[0.03] dark:active:bg-white/[0.04]',
        bordered && 'border-b border-white/40 dark:border-white/8',
      )}
    >
      <span className="glass-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-white/50 dark:border-white/10">
        <Icon size={17} strokeWidth={2.25} className={TG} />
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-[15px] font-semibold text-text">{item.label}</span>
        {item.sublabel && (
          <p className="mt-0.5 text-[11px] font-semibold text-text-soft">{item.sublabel}</p>
        )}
      </div>
      <ChevronLeft size={18} strokeWidth={2.25} className="shrink-0 text-[#C7C7CC] dark:text-[#48484A]" />
    </button>
  )
}
