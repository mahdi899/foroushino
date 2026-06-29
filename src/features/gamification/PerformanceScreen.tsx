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
  Crown,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
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
  const goalComplete = remaining === 0 && me.callGoal > 0
  const barPct = Math.min(goalPct, 100)

  return (
    <Page>
      <ScreenHeader
        title="عملکرد من"
        subtitle="پیشرفت و دستاوردهای امروز"
        icon={Trophy}
        iconTone="warning"
      />

      <div className="space-y-5 px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary-800 via-primary-600 to-primary-400 p-5 text-white shadow-float"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-10 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </div>

          <div className="relative flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold backdrop-blur-sm">
                  <Target size={12} className="text-emerald-200" />
                  هدف روزانه
                </span>
                {me.streak > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white/90 backdrop-blur-sm">
                    <Flame size={13} className="text-emerald-200" />
                    {toFa(me.streak)} روز
                  </span>
                )}
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-white/65">پیشرفت امروز</span>
                  <span className="tabular-nums text-white/90">
                    {toFa(me.callsToday)}
                    <span className="text-white/50"> / </span>
                    {toFa(me.callGoal)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barPct}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
                    className="h-full rounded-full bg-gradient-to-l from-emerald-200 via-white to-emerald-100 shadow-[0_0_10px_rgba(255,255,255,0.35)]"
                  />
                </div>
              </div>
            </div>

            <div className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-[20px] border border-white/20 bg-white/10 backdrop-blur-sm">
              {goalComplete ? (
                <>
                  <CheckCircle2 size={26} className="text-emerald-200" strokeWidth={2.5} />
                  <span className="mt-1 text-[9px] font-bold text-white/55">کامل شد</span>
                </>
              ) : (
                <>
                  <span className="text-[28px] font-black tabular-nums leading-none">{toFa(remaining)}</span>
                  <span className="mt-0.5 text-[10px] font-bold text-white/55">تماس مانده</span>
                </>
              )}
            </div>
          </div>
        </motion.div>

        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-extrabold text-neutral-900">
            <TrendingUp size={16} className="text-primary-500" />
            خلاصه عملکرد امروز
          </h2>
          <div className="grid grid-cols-4 gap-2">
            <StatTile variant="compact" icon={<Phone size={14} />} value={me.callsToday} label="تماس‌ها" trend={3} />
            <StatTile variant="compact" icon={<CheckCircle2 size={14} />} value={me.successfulToday} label="موفق" trend={2} tone="success" />
            <StatTile variant="compact" icon={<Target size={14} />} value={`${toFa(me.conversionRate)}٪`} label="نرخ تبدیل" trend={6} tone="secondary" />
            <StatTile variant="compact" icon={<Clock size={14} />} value="۲:۴۵" label="زمان مکالمه" trend={20} tone="accent" />
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

  const rankConfig = {
    1: {
      avatarSize: 56,
      stepHeight: 'h-[76px]',
      step: 'border border-warning-200 border-b-0 border-t-4 border-t-warning-400 bg-warning-100',
      rankText: 'text-warning-600',
      crown: true,
    },
    2: {
      avatarSize: 48,
      stepHeight: 'h-[56px]',
      step: 'border border-neutral-200 border-b-0 border-t-4 border-t-neutral-400 bg-neutral-100',
      rankText: 'text-neutral-500',
      crown: false,
    },
    3: {
      avatarSize: 44,
      stepHeight: 'h-[44px]',
      step: 'border border-accent-200 border-b-0 border-t-4 border-t-accent-400 bg-accent-100',
      rankText: 'text-accent-600',
      crown: false,
    },
  } as const

  return (
    <div className="rounded-3xl border border-border/60 bg-white p-4 pt-5 shadow-card">
      <div className="flex items-end justify-center gap-2">
        {order.map((idx, pos) => {
          const agent = podium[idx]
          if (!agent) return <div key={pos} className="flex-1" />
          const rank = (idx + 1) as 1 | 2 | 3
          const cfg = rankConfig[rank]
          const isMe = agent.id === meId

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: pos * 0.1, type: 'spring', stiffness: 260, damping: 22 }}
              className="flex min-w-0 flex-1 flex-col items-center"
            >
              <div className="relative mb-2.5 flex flex-col items-center">
                {cfg.crown && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, type: 'spring' }}
                    className="mb-1"
                  >
                    <Crown size={17} className="text-warning-500" fill="currentColor" strokeWidth={1.5} />
                  </motion.div>
                )}
                <div
                  className={cn(
                    'rounded-full',
                    isMe && 'ring-2 ring-primary-300 ring-offset-2 ring-offset-white',
                  )}
                >
                  <Avatar
                    id={agent.id}
                    first={agent.firstName}
                    last={agent.lastName}
                    src={agent.avatar}
                    size={cfg.avatarSize}
                    ring
                  />
                </div>
              </div>

              <p className="max-w-full truncate text-center text-[12px] font-extrabold text-neutral-800">
                {agent.firstName}
                {isMe && (
                  <span className="mr-0.5 text-[10px] font-bold text-primary-600">(تو)</span>
                )}
              </p>

              <span
                className={cn(
                  'mt-1 inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums',
                  isMe
                    ? 'border-primary-100 bg-primary-50 text-primary-700'
                    : 'border-border bg-neutral-50 text-neutral-500',
                )}
              >
                <Phone size={9} strokeWidth={2.5} />
                {toFa(agent.callsToday)}
              </span>

              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: pos * 0.1 + 0.15, duration: 0.45, ease: 'easeOut' }}
                style={{ transformOrigin: 'bottom' }}
                className={cn(
                  'mt-2.5 w-full rounded-t-2xl shadow-[inset_0_2px_6px_rgba(0,0,0,0.04)]',
                  cfg.stepHeight,
                  cfg.step,
                )}
              >
                <div className="flex h-full items-center justify-center">
                  <span
                    className={cn(
                      'text-[28px] font-black tabular-nums leading-none',
                      cfg.rankText,
                    )}
                  >
                    {toFa(rank)}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
