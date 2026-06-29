import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Flame,
  Target,
  Phone,
  CheckCircle2,
  Clock,
  TrendingUp,
  Trophy,
  Award,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { StatTile } from '@/components/domain/StatTile'
import { LeaderboardRow } from '@/components/domain/LeaderboardRow'
import { AchievementBadge } from '@/components/domain/AchievementBadge'
import { Avatar } from '@/components/ui/Avatar'
import { achievements } from '@/data/mock'
import { toFa } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Agent } from '@/types'

export function PerformanceScreen() {
  const agents = useStore((s) => s.agents)
  const me = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))

  const teamAgents = useMemo(
    () =>
      agents
        .filter((a) => a.role === 'agent')
        .sort((a, b) => b.callsToday - a.callsToday),
    [agents],
  )
  const podium = teamAgents.slice(0, 3)
  const rest = teamAgents.slice(3, 5)

  if (!me) return null
  const goalPct = me.callGoal ? Math.round((me.callsToday / me.callGoal) * 100) : 0
  const remaining = Math.max(0, me.callGoal - me.callsToday)

  return (
    <Page>
      <div className="px-4 pt-[calc(14px+var(--safe-top))]">
        <h1 className="text-center text-base font-extrabold text-neutral-900">عملکرد من</h1>
      </div>

      <div className="space-y-5 px-4 pt-3">
        <div className="rounded-[28px] bg-surface p-5 shadow-card border border-border/60">
          <div className="flex items-center gap-5">
            <ProgressRing value={goalPct} size={120} stroke={12} gradient={['#f59e0b', '#10b981']}>
              <div className="text-center">
                <p className="text-[10px] font-bold text-neutral-400">هدف امروز</p>
                <p className="text-2xl font-black text-neutral-900 tabular-nums leading-6">
                  {toFa(me.callsToday)}
                </p>
                <p className="text-[11px] font-bold text-primary-600 tabular-nums">
                  از {toFa(me.callGoal)}
                </p>
              </div>
            </ProgressRing>
            <div className="flex-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700">
                <Target size={12} />
                هدف روزانه
              </span>
              <p className="mt-2 text-[15px] font-extrabold text-neutral-900">
                {remaining > 0 ? 'عالیه، به هدف نزدیک شدی' : 'هدف امروز کامل شد'}
              </p>
              <p className="mt-0.5 text-[12px] font-bold text-neutral-400">
                {remaining > 0 ? `${toFa(remaining)} تماس دیگه تا تکمیل هدف` : 'فردا هم همینطور ادامه بده'}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-accent-50 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-100 text-accent-600">
              <Flame size={18} />
            </span>
            <div>
              <p className="text-[11px] font-bold text-neutral-400">رکورد فعلی</p>
              <p className="text-[13px] font-extrabold text-neutral-900">
                {toFa(me.streak)} روز پشت سر هم
              </p>
            </div>
          </div>
        </div>

        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-extrabold text-neutral-900">
            <TrendingUp size={16} className="text-primary-500" />
            خلاصه عملکرد امروز
          </h2>
          <div className="grid grid-cols-4 gap-2">
            <StatTile icon={<Phone size={15} />} value={me.callsToday} label="تماس‌ها" trend={3} />
            <StatTile icon={<CheckCircle2 size={15} />} value={me.successfulToday} label="موفق" trend={2} tone="success" />
            <StatTile icon={<Target size={15} />} value={`${toFa(me.conversionRate)}٪`} label="نرخ تبدیل" trend={6} tone="secondary" />
            <StatTile icon={<Clock size={15} />} value="۲:۴۵" label="زمان مکالمه" trend={20} tone="accent" />
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-extrabold text-neutral-900">
            <Trophy size={16} className="text-warning-500" />
            برترین‌های تیم
          </h2>
          <Podium podium={podium} meId={me.id} />
          <div className="mt-3 space-y-2">
            {rest.map((a, i) => (
              <LeaderboardRow
                key={a.id}
                agent={a}
                rank={i + 4}
                index={i}
                highlight={a.id === me.id}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-extrabold text-neutral-900">
            <Award size={16} className="text-secondary-500" />
            دستاوردهای من
          </h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {achievements.map((ach, i) => (
              <AchievementBadge key={ach.id} ach={ach} index={i} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-extrabold text-neutral-900">
            <Zap size={16} className="text-accent-500" />
            چالش روزانه
          </h2>
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-secondary-500 to-secondary-600 p-5 text-white shadow-float">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-white/80">۳ ثبت‌نام موفق امروز</p>
                <p className="mt-1 text-lg font-black">جایزه: ۵۰۰ امتیاز</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black tabular-nums">{toFa(2)}/{toFa(3)}</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-2/3 rounded-full bg-white" />
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3 rounded-2xl bg-primary-50 p-4">
          <Sparkles size={20} className="shrink-0 text-primary-600" />
          <p className="text-[13px] font-bold text-neutral-700">
            عملکرد امروز ۸٪ بهتر از میانگین هفتگیته، به همین روند ادامه بده
          </p>
        </div>
      </div>
    </Page>
  )
}

function Podium({ podium, meId }: { podium: Agent[]; meId: string }) {
  const order = [1, 0, 2]
  const heights = ['h-20', 'h-28', 'h-16']
  return (
    <div className="flex items-end justify-center gap-2 rounded-3xl bg-surface p-4 shadow-card border border-border/60">
      {order.map((idx, pos) => {
        const agent = podium[idx]
        if (!agent) return <div key={pos} className="flex-1" />
        const rank = idx + 1
        const isMe = agent.id === meId
        return (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: pos * 0.08 }}
            className="flex flex-1 flex-col items-center"
          >
            <div className="relative">
              <Avatar first={agent.firstName} last={agent.lastName} size={rank === 1 ? 56 : 46} ring />
              <span
                className={cn(
                  'absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black text-white ring-2 ring-surface',
                  rank === 1 ? 'bg-warning-400' : rank === 2 ? 'bg-neutral-300' : 'bg-accent-400',
                )}
              >
                {toFa(rank)}
              </span>
            </div>
            <p className="mt-2 max-w-full truncate text-[12px] font-extrabold text-neutral-800">
              {agent.firstName}
              {isMe && <span className="text-primary-600"> (تو)</span>}
            </p>
            <p className="text-[11px] font-bold text-primary-600 tabular-nums">{toFa(agent.callsToday)} تماس</p>
            <div
              className={cn(
                'mt-2 w-full rounded-t-xl',
                heights[pos],
                rank === 1 ? 'bg-warning-100' : rank === 2 ? 'bg-neutral-100' : 'bg-accent-100',
              )}
            />
          </motion.div>
        )
      })}
    </div>
  )
}
