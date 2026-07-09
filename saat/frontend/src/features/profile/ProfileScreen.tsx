import { useNavigate } from 'react-router-dom'
import {
  Settings,
  Bell,
  Trophy,
  ChevronLeft,
  LogOut,
  Star,
  Flame,
  Target,
  HelpCircle,
  ShieldCheck,
  Activity,
  BadgeDollarSign,
  WalletCards,
  GraduationCap,
  History,
  BadgeCheck,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { Avatar } from '@/components/ui/Avatar'
import { roleLabels } from '@/data/labels'
import { toFa } from '@/lib/format'
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

function PremiumProfileAvatar({
  id,
  first,
  last,
  src,
}: {
  id: string
  first: string
  last: string
  src?: string | null
}) {
  return (
    <div className="relative flex h-[104px] w-[104px] items-center justify-center">
      <div
        aria-hidden
        className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#FFB000]/35 via-[#3390EC]/28 to-[#8774E1]/32 blur-lg"
      />
      <div
        aria-hidden
        className="absolute inset-0 animate-[spin_12s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,#FFE08A,#FFB000,#3390EC,#5EB0FF,#8774E1,#10A37F,#FFE08A)] opacity-95"
      />
      <div className="absolute inset-[3px] rounded-full bg-background/95 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)] dark:bg-background/90" />
      <div className="relative z-[1] rounded-full p-[2px] shadow-[0_10px_28px_-8px_rgba(51,144,236,0.45)]">
        <Avatar id={id} first={first} last={last} src={src} size={92} ring={false} />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-3 top-2 h-[38%] rounded-t-full bg-gradient-to-b from-white/45 to-transparent"
        />
      </div>
      <span className="absolute -bottom-0.5 -left-0.5 z-[2] flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#3390EC] to-[#8774E1] shadow-[0_4px_12px_-2px_rgba(51,144,236,0.55)] ring-2 ring-white dark:ring-neutral-900">
        <BadgeCheck size={15} strokeWidth={2.5} className="text-white" />
      </span>
    </div>
  )
}

export function ProfileScreen() {
  const navigate = useNavigate()
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const logout = useStore((s) => s.logout)
  if (!agent) return null

  const stats: { icon: LucideIcon; label: string; value: string; tone: StatTone }[] = [
    { icon: Flame, label: 'streak', value: `${toFa(agent.streak)} روز`, tone: 'warning' },
    { icon: Star, label: 'امتیاز', value: toFa(agent.points), tone: 'primary' },
    { icon: Target, label: 'نرخ تبدیل', value: `${toFa(agent.conversionRate)}٪`, tone: 'success' },
  ]

  const menu: { icon: LucideIcon; label: string; onClick: () => void }[] = [
    ...(agent.role === 'agent'
      ? [{ icon: Activity, label: 'وضعیت کاری من', onClick: () => navigate('/work-status') }]
      : []),
    { icon: BadgeDollarSign, label: 'فروش‌های من', onClick: () => navigate('/sales') },
    ...(agent.role === 'agent'
      ? [{ icon: WalletCards, label: 'درآمد من', onClick: () => navigate('/wallet') }]
      : []),
    { icon: Trophy, label: 'عملکرد و دستاوردها', onClick: () => navigate('/performance') },
    ...(agent.role === 'agent'
      ? [{ icon: GraduationCap, label: 'آموزش و اسکریپت فروش', onClick: () => navigate('/training') }]
      : []),
    { icon: Bell, label: 'اعلان‌ها', onClick: () => navigate('/notifications') },
    { icon: History, label: 'تاریخچه فعالیت', onClick: () => navigate('/activity') },
    { icon: Settings, label: 'تنظیمات', onClick: () => navigate('/settings') },
    { icon: ShieldCheck, label: 'حریم خصوصی', onClick: () => navigate('/settings') },
    { icon: HelpCircle, label: 'راهنما و پشتیبانی', onClick: () => navigate('/settings') },
  ]

  return (
    <Page>
      <TopBar title="پروفایل" onBack={() => navigate('/home')} />

      <div className="space-y-4 px-4 pt-4">
        <div className="glass-card relative overflow-hidden rounded-[26px] border border-white/55 p-5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-[#3390EC]/18 blur-3xl" />
            <div className="absolute -bottom-8 -right-6 h-32 w-32 rounded-full bg-[#8774E1]/12 blur-3xl" />
            <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/15" />
          </div>

          <div className="relative flex flex-col items-center">
            <PremiumProfileAvatar
              id={agent.id}
              first={agent.firstName}
              last={agent.lastName}
              src={agent.avatar}
            />
            <h2 className="mt-3 text-[20px] font-bold tracking-tight text-neutral-900 dark:text-white">
              {agent.firstName} {agent.lastName}
            </h2>
            <p className="mt-0.5 text-[13px] font-medium text-[#8E8E93] dark:text-[#98989D]">
              {roleLabels[agent.role]} · سطح {toFa(agent.level)}
            </p>

            <div className="glass-inset relative mt-4 flex w-full items-stretch rounded-2xl border border-white/50 px-1 py-3.5 dark:border-white/10">
              {stats.map((s) => (
                <div key={s.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 px-1">
                  <ProfileStatIcon icon={s.icon} tone={s.tone} />
                  <span className="text-[15px] font-bold tabular-nums text-neutral-900 dark:text-white">{s.value}</span>
                  <span className="text-[10px] font-semibold text-[#8E8E93] dark:text-[#98989D]">{s.label}</span>
                </div>
              ))}
              <div className="pointer-events-none absolute inset-y-4 left-1/3 w-px -translate-x-1/2 bg-white/45 dark:bg-white/10" />
              <div className="pointer-events-none absolute inset-y-4 left-2/3 w-px -translate-x-1/2 bg-white/45 dark:bg-white/10" />
            </div>
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
          <LogOut size={18} strokeWidth={2.25} />
          خروج از حساب
        </button>

        <p className="pb-2 text-center text-[11px] font-medium text-[#8E8E93] dark:text-[#98989D]">سات · نسخه ۱.۰.۰</p>
      </div>
    </Page>
  )
}
