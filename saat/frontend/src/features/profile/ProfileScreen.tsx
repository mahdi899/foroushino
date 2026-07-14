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
  Server,
  Users,
  BarChart3,
  Phone,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import { isAgentRole, isManagementRole } from '@/lib/roles'
import { hasPermission } from '@/lib/permissions'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { ProfileAvatarPicker } from '@/features/profile/ProfileAvatarPicker'
import { roleLabels } from '@/data/labels'
import { conversionRateFromStats } from '@/lib/dailyGoal'
import { getTeamAgentIds } from '@/lib/teamUtils'
import { toFa } from '@/lib/format'
import { APP_VERSION_LABEL } from '@/lib/app'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

type StatTone = 'warning' | 'primary' | 'success'

const statIconBox: Record<StatTone, string> = {
  warning:
    'border-warning-300/45 bg-gradient-to-br from-warning-400/20 to-warning-500/8 text-warning-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_14px_-4px_rgba(255,176,0,0.4)]',
  primary:
    'border-[#3390EC]/28 bg-gradient-to-br from-[#3390EC]/18 to-[#3390EC]/6 text-[#3390EC] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_14px_-4px_rgba(51,144,236,0.4)] dark:border-[#8774E1]/32 dark:from-[#8774E1]/22 dark:to-[#8774E1]/8 dark:text-[#8774E1]',
  success:
    'border-emerald-400/35 bg-gradient-to-br from-emerald-400/18 to-emerald-500/8 text-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_14px_-4px_rgba(16,163,127,0.38)]',
}

function ProfileStatIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: StatTone }) {
  const filled = tone === 'primary' || tone === 'warning'
  return (
    <span
      className={cn(
        'relative flex h-11 w-11 items-center justify-center rounded-[15px] border backdrop-blur-sm',
        statIconBox[tone],
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-2 top-1 h-[42%] rounded-t-[10px] bg-gradient-to-b from-white/55 to-transparent dark:from-white/12"
      />
      <Icon
        size={20}
        strokeWidth={2.25}
        fill={filled ? 'currentColor' : 'none'}
        fillOpacity={filled ? 0.22 : undefined}
        className="relative z-[1]"
      />
    </span>
  )
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
  if (!agent) return null

  const agentLine = isAgentRole(role)
  const management = isManagementRole(role)
  const canOpenAdminSettings = hasPermission(permissions, 'admin.settings')
  const reportsPath = management ? '/reports' : '/performance'

  const profileStats = useMemo(() => {
    if (management) {
      const teamAgentIds = getTeamAgentIds(teams, agents, currentAgentId, role)
      const teamAgents = agents.filter(
        (member) => teamAgentIds.includes(member.id) && member.role === 'agent',
      )
      const calls = teamAgents.reduce((sum, member) => sum + member.callsToday, 0)
      const successful = teamAgents.reduce((sum, member) => sum + member.successfulToday, 0)
      const conversion = conversionRateFromStats(calls, successful)

      return [
        { icon: Phone, label: 'تماس تیم', value: toFa(calls), tone: 'primary' as const },
        { icon: CheckCircle2, label: 'موفق تیم', value: toFa(successful), tone: 'success' as const },
        { icon: Target, label: 'نرخ تبدیل', value: `${toFa(conversion)}٪`, tone: 'warning' as const },
      ]
    }

    const calls = agent.callsToday
    const successful = agent.successfulToday
    const conversion =
      agent.conversionRate > 0
        ? agent.conversionRate
        : conversionRateFromStats(calls, successful)

    return [
      { icon: Phone, label: 'تماس امروز', value: toFa(calls), tone: 'primary' as const },
      { icon: CheckCircle2, label: 'موفق امروز', value: toFa(successful), tone: 'success' as const },
      { icon: Target, label: 'نرخ تبدیل', value: `${toFa(conversion)}٪`, tone: 'warning' as const },
    ]
  }, [management, teams, agents, currentAgentId, role, agent])

  const menu: { icon: LucideIcon; label: string; onClick: () => void }[] = [
    ...(agentLine
      ? [{ icon: Activity, label: 'وضعیت کاری من', onClick: () => navigate('/work-status') }]
      : []),
    { icon: BadgeDollarSign, label: management ? 'فروش‌ها' : 'فروش‌های من', onClick: () => navigate('/sales') },
    ...(agentLine
      ? [{ icon: WalletCards, label: 'درآمد من', onClick: () => navigate('/wallet') }]
      : []),
    ...(agentLine
      ? [{ icon: GraduationCap, label: 'آموزش و اسکریپت فروش', onClick: () => navigate('/training') }]
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
    { icon: Bell, label: 'اعلان‌ها', onClick: () => navigate('/notifications') },
    { icon: History, label: management && hasPermission(permissions, 'reports.view-all') ? 'فعالیت سیستم' : 'تاریخچه فعالیت', onClick: () => navigate('/activity') },
    { icon: Settings, label: 'تنظیمات', onClick: () => navigate('/settings') },
    { icon: ShieldCheck, label: 'حریم خصوصی', onClick: () => navigate('/settings') },
    { icon: HelpCircle, label: 'راهنما و پشتیبانی', onClick: () => navigate('/settings') },
  ]

  return (
    <Page>
      <TopBar title="پروفایل" showBack={false} />

      <div className="space-y-4 px-4 pt-4">
        <div className="glass-card relative overflow-hidden rounded-[26px] border border-white/55 p-5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-[#3390EC]/18 blur-3xl" />
            <div className="absolute -bottom-8 -right-6 h-32 w-32 rounded-full bg-[#8774E1]/12 blur-3xl" />
            <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/15" />
          </div>

          <div className="relative flex flex-col items-center">
            <ProfileAvatarPicker
              id={agent.id}
              first={agent.firstName}
              last={agent.lastName}
              src={agent.avatar}
            />
            <h2 className="mt-1 text-[20px] font-bold tracking-tight text-neutral-900 dark:text-white">
              {agent.firstName} {agent.lastName}
            </h2>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <p className="text-[13px] font-medium text-[#8E8E93] dark:text-[#98989D]">
                {roleLabels[agent.role]}
              </p>
              {agentLine && agent.streak > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-bold text-orange-600 dark:text-orange-300">
                  <Flame size={12} strokeWidth={2.35} />
                  {toFa(agent.streak)} روز متوالی
                </span>
              )}
              {agentLine && agent.points > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#3390EC]/20 bg-[#3390EC]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#3390EC] dark:border-[#8774E1]/25 dark:text-[#8774E1]">
                  {toFa(agent.points)} امتیاز
                </span>
              )}
            </div>

            <div className="glass-inset relative mt-4 flex w-full items-stretch rounded-2xl border border-white/50 px-1 py-3.5 dark:border-white/10">
              {profileStats.map((stat) => (
                <div key={stat.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 px-1">
                  <ProfileStatIcon icon={stat.icon} tone={stat.tone} />
                  <span className="text-[15px] font-bold tabular-nums text-neutral-900 dark:text-white">
                    {stat.value}
                  </span>
                  <span className="text-center text-[10px] font-semibold leading-tight text-[#8E8E93] dark:text-[#98989D]">
                    {stat.label}
                  </span>
                </div>
              ))}
              <div className="pointer-events-none absolute inset-y-4 left-1/3 w-px -translate-x-1/2 bg-white/45 dark:bg-white/10" />
              <div className="pointer-events-none absolute inset-y-4 left-2/3 w-px -translate-x-1/2 bg-white/45 dark:bg-white/10" />
            </div>

            {agentLine && agent.callGoal > 0 && (
              <div className="mt-3 w-full">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-[#8E8E93] dark:text-[#98989D]">پیشرفت هدف تماس امروز</span>
                  <span className="tabular-nums text-neutral-900 dark:text-white">
                    {toFa(agent.callsToday)}
                    <span className="text-[#8E8E93] dark:text-[#98989D]"> / </span>
                    {toFa(agent.callGoal)}
                  </span>
                </div>
                <div className="h-[5px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-[#3390EC] to-[#5EB0FF] dark:from-[#8774E1] dark:to-[#A894EE]"
                    style={{
                      width: `${Math.min(100, Math.round((agent.callsToday / agent.callGoal) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <motion.button
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28, delay: 0.12 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                haptic('medium')
                navigate(reportsPath)
              }}
              className={cn(
                'relative mt-3 flex w-full items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5',
                'bg-gradient-to-l from-[#3390EC] to-[#5EB0FF] text-white',
                'shadow-[0_10px_28px_-8px_rgba(51,144,236,0.65)]',
                'dark:from-[#8774E1] dark:to-[#A894EE] dark:shadow-[0_10px_28px_-8px_rgba(135,116,225,0.55)]',
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -left-6 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-white/20 blur-2xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.22)_50%,transparent_60%)]"
              />
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
                <BarChart3 size={20} strokeWidth={2.35} />
              </span>
              <span className="relative flex min-w-0 flex-1 flex-col items-start text-right">
                <span className="text-[15px] font-extrabold leading-tight">گزارش‌ها</span>
                <span className="text-[11px] font-semibold text-white/85">
                  {management ? 'عملکرد تیم و آمار کلی' : 'عملکرد، دستاوردها و لیدربورد'}
                </span>
              </span>
              <ChevronLeft size={20} strokeWidth={2.35} className="relative shrink-0 text-white/90" />
            </motion.button>
          </div>
        </div>

        <div className="glass-card overflow-hidden rounded-[22px] border border-white/55 dark:border-white/10">
          {menu.map((item, i) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3.5 transition-colors active:bg-black/[0.03] dark:active:bg-white/[0.04]',
                i < menu.length - 1 && 'border-b border-white/40 dark:border-white/8',
              )}
            >
              <span className="glass-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/50 dark:border-white/10">
                <item.icon size={17} strokeWidth={2.25} className="text-[#3390EC] dark:text-[#8774E1]" />
              </span>
              <span className="flex-1 text-right text-[15px] font-semibold text-neutral-800 dark:text-neutral-100">
                {item.label}
              </span>
              <ChevronLeft size={18} strokeWidth={2.25} className="text-[#C7C7CC] dark:text-[#48484A]" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          className="glass-inset flex w-full items-center justify-center gap-2 rounded-[22px] border border-error-200/60 py-3.5 text-sm font-bold text-error-600 transition-all active:scale-[0.98] dark:border-error-500/25"
        >
          <LogOut size={18} strokeWidth={2.35} />
          خروج از حساب
        </button>

        <p className="pb-2 text-center text-[11px] font-medium text-[#8E8E93] dark:text-[#98989D]">{APP_VERSION_LABEL}</p>
      </div>
    </Page>
  )
}
