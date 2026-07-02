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
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { Avatar } from '@/components/ui/Avatar'
import { roleLabels } from '@/data/labels'
import { toFa } from '@/lib/format'

export function ProfileScreen() {
  const navigate = useNavigate()
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const logout = useStore((s) => s.logout)
  if (!agent) return null

  const stats = [
    { icon: Flame, label: 'streak', value: `${toFa(agent.streak)} روز` },
    { icon: Star, label: 'امتیاز', value: toFa(agent.points) },
    { icon: Target, label: 'نرخ تبدیل', value: `${toFa(agent.conversionRate)}٪` },
  ]

  const menu: { icon: LucideIcon; label: string; onClick: () => void }[] = [
    { icon: Trophy, label: 'عملکرد و دستاوردها', onClick: () => navigate('/performance') },
    { icon: Bell, label: 'اعلان‌ها', onClick: () => navigate('/notifications') },
    { icon: Settings, label: 'تنظیمات', onClick: () => navigate('/settings') },
    { icon: ShieldCheck, label: 'حریم خصوصی', onClick: () => navigate('/settings') },
    { icon: HelpCircle, label: 'راهنما و پشتیبانی', onClick: () => navigate('/settings') },
  ]

  return (
    <Page>
      <TopBar title="پروفایل" onBack={() => navigate('/home')} />

      <div className="space-y-5 px-4">
        <div className="flex flex-col items-center rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 p-6 text-white shadow-float">
          <Avatar id={agent.id} first={agent.firstName} last={agent.lastName} src={agent.avatar} size={84} ring />
          <h2 className="mt-3 text-xl font-black">
            {agent.firstName} {agent.lastName}
          </h2>
          <p className="mt-0.5 text-[13px] font-bold text-white/80">
            {roleLabels[agent.role]} · سطح {toFa(agent.level)}
          </p>
          <div className="mt-4 flex w-full justify-around rounded-2xl bg-white/15 p-3">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <s.icon size={18} />
                <span className="mt-1 text-[15px] font-extrabold tabular-nums">{s.value}</span>
                <span className="text-[10px] font-bold text-white/70">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-surface shadow-card border border-border/60">
          {menu.map((item, i) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={
                'flex w-full items-center gap-3 px-4 py-3.5 active:bg-neutral-50 ' +
                (i < menu.length - 1 ? 'border-b border-border/60' : '')
              }
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <item.icon size={18} />
              </span>
              <span className="flex-1 text-right text-[14px] font-bold text-neutral-800">
                {item.label}
              </span>
              <ChevronLeft size={18} className="text-neutral-300" />
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-error-50 py-3.5 text-sm font-extrabold text-error-600"
        >
          <LogOut size={18} />
          خروج از حساب
        </button>

        <p className="text-center text-[11px] font-bold text-neutral-300">سات · نسخه ۱.۰.۰</p>
      </div>
    </Page>
  )
}
