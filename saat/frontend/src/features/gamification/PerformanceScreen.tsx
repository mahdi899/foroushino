import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  ThermometerSun,
  AlarmClock,
  NotebookPen,
  BadgeDollarSign,
  ChevronLeft,
  Gauge,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { StatTile } from '@/components/domain/StatTile'
import { LeaderboardRow } from '@/components/domain/LeaderboardRow'
import { AchievementBadge, AchievementBadgeIcon } from '@/components/domain/AchievementBadge'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Avatar } from '@/components/ui/Avatar'
import { achievements } from '@/data/mock'
import { overdueFollowups } from '@/lib/leadUtils'
import { formatDuration, formatMoney, toFa } from '@/lib/format'
import { cn } from '@/lib/cn'
import { haptic } from '@/lib/telegram'
import type { Agent, Achievement } from '@/types'

export function PerformanceScreen() {
  const navigate = useNavigate()
  const agents = useStore((s) => s.agents)
  const me = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const myId = useStore((s) => s.currentAgentId)
  const calls = useStore((s) => s.calls.filter((c) => c.agentId === myId))
  const leads = useStore((s) => s.leads)
  const followups = useStore((s) => s.followups.filter((f) => f.agentId === myId))
  const sales = useStore((s) => s.sales.filter((sl) => sl.agentId === myId))
  const commissions = useStore((s) => s.commissions.filter((c) => c.agentId === myId))
  const [selectedAch, setSelectedAch] = useState<Achievement | null>(null)

  const teamAgents = useMemo(
    () =>
      agents
        .filter((a) => a.role === 'agent')
        .sort((a, b) => b.callsToday - a.callsToday),
    [agents],
  )
  const podium = teamAgents.slice(0, 3)
  const rest = teamAgents.slice(3, 5)

  const quality = useMemo(() => {
    const totalCalls = calls.length
    const answered = calls.filter((c) => c.result !== 'no_answer' && c.result !== 'unavailable').length
    const answerRate = totalCalls ? Math.round((answered / totalCalls) * 100) : 0
    const avgTalkSec = totalCalls ? Math.round(calls.reduce((sum, c) => sum + c.durationSec, 0) / totalCalls) : 0
    const goodNotes = calls.filter((c) => c.note && c.note.trim().length >= 12).length
    const noteQuality = totalCalls ? Math.round((goodNotes / totalCalls) * 100) : 0
    const hotLeads = leads.filter((l) => l.assignedAgentId === myId && l.temperature === 'hot').length
    const overdue = overdueFollowups(followups).length
    const confirmedSales = sales.filter((s) => s.status === 'confirmed').length
    const approvedCommission = commissions
      .filter((c) => c.status === 'approved' || c.status === 'available' || c.status === 'paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0)
    const teamAvgCalls = teamAgents.length
      ? Math.round(teamAgents.reduce((s, a) => s + a.callsToday, 0) / teamAgents.length)
      : 0
    return {
      totalCalls,
      answerRate,
      avgTalkSec,
      noteQuality,
      hotLeads,
      overdue,
      confirmedSales,
      approvedCommission,
      teamAvgCalls,
    }
  }, [calls, leads, followups, sales, commissions, myId, teamAgents])

  const nextAction = useMemo(() => {
    if (quality.overdue > 0)
      return {
        icon: AlarmClock,
        text: `${toFa(quality.overdue)} پیگیری عقب‌افتاده داری؛ همین حالا انجامشون بده.`,
        href: '/followups',
        cta: 'رفتن به پیگیری‌ها',
      }
    if (quality.hotLeads > 0)
      return {
        icon: ThermometerSun,
        text: `${toFa(quality.hotLeads)} لید داغ منتظر تماس توئه.`,
        href: '/leads?temp=hot',
        cta: 'مشاهده لیدهای داغ',
      }
    if (quality.noteQuality < 50 && quality.totalCalls > 0)
      return {
        icon: NotebookPen,
        text: 'کیفیت یادداشت تماس‌هات پایینه؛ جزئیات بیشتری ثبت کن تا پیگیری راحت‌تر بشه.',
        href: '/home',
        cta: 'شروع تماس بعدی',
      }
    if (me && me.callsToday < me.callGoal)
      return {
        icon: Phone,
        text: `${toFa(me.callGoal - me.callsToday)} تماس دیگه تا رسیدن به هدف امروز مونده.`,
        href: '/home',
        cta: 'ادامه تماس‌ها',
      }
    return {
      icon: Sparkles,
      text: 'عملکرد امروزت عالیه! همین روند رو ادامه بده.',
      href: '/home',
      cta: 'بازگشت به خانه',
    }
  }, [quality, me])

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

      <div className="flex flex-col gap-6 px-4">
        <div
          className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary-800 via-primary-600 to-primary-400 p-5 text-white shadow-float"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-10 h-48 w-48 rounded-full bg-primary-300/20 blur-3xl" />
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
                  <Target size={12} className="text-primary-200" />
                  هدف روزانه
                </span>
                {me.streak > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white/90 backdrop-blur-sm">
                    <Flame size={13} className="text-primary-200" />
                    {toFa(me.streak)} روز
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white/90 backdrop-blur-sm">
                  <Crown size={13} className="text-primary-200" />
                  سطح {toFa(me.level)}
                </span>
              </div>

              <div className="mt-4 max-w-[210px]">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-bold">
                  <span className="text-white/65">پیشرفت امروز</span>
                  <span className="shrink-0 tabular-nums text-white/90">
                    {toFa(me.callsToday)}
                    <span className="text-white/50"> / </span>
                    {toFa(me.callGoal)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-primary-200 via-white to-primary-100 shadow-[0_0_10px_rgba(234,251,251,0.35)] transition-[width] duration-500 ease-out"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[20px] border border-white/20 bg-white/10 backdrop-blur-sm">
              {goalComplete ? (
                <CheckCircle2 size={36} className="text-primary-200" strokeWidth={2.25} />
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-[28px] font-black tabular-nums leading-none">{toFa(remaining)}</span>
                  <span className="mt-0.5 text-[10px] font-bold text-white/55">تماس مانده</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-extrabold text-neutral-900">
            <TrendingUp size={16} className="text-primary-500" />
            خلاصه عملکرد امروز
          </h2>
          <div className="grid grid-cols-4 gap-2">
            <StatTile variant="compact" icon={<Phone size={18} />} value={me.callsToday} label="تماس‌ها" />
            <StatTile variant="compact" icon={<CheckCircle2 size={18} />} value={me.successfulToday} label="موفق" tone="success" />
            <StatTile variant="compact" icon={<Target size={18} />} value={`${toFa(me.conversionRate)}٪`} label="نرخ تبدیل" tone="secondary" />
            <StatTile
              variant="compact"
              icon={<Clock size={18} />}
              value={formatDuration(quality.avgTalkSec)}
              label="میانگین مکالمه"
              tone="accent"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-extrabold text-neutral-900">
            <Gauge size={16} className="text-secondary-500" />
            کیفیت تماس و پیگیری
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            <QualityTile icon={CheckCircle2} label="نرخ پاسخ‌دهی" value={`${toFa(quality.answerRate)}٪`} tone="success" />
            <QualityTile icon={NotebookPen} label="کیفیت یادداشت" value={`${toFa(quality.noteQuality)}٪`} tone="secondary" />
            <QualityTile icon={ThermometerSun} label="لیدهای داغ من" value={toFa(quality.hotLeads)} tone="hot" warn={quality.hotLeads > 0} />
            <QualityTile
              icon={AlarmClock}
              label="پیگیری عقب‌افتاده"
              value={toFa(quality.overdue)}
              tone="warning"
              warn={quality.overdue > 0}
            />
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <QualityTile icon={Trophy} label="فروش تاییدشده" value={toFa(quality.confirmedSales)} tone="primary" />
            <QualityTile
              icon={BadgeDollarSign}
              label="پورسانت تاییدشده"
              value={`${formatMoney(quality.approvedCommission)} ت`}
              tone="success"
              small
            />
          </div>
          <p className="mt-2.5 px-1 text-[11px] font-bold text-neutral-400">
            میانگین تماس امروز تیم: {toFa(quality.teamAvgCalls)} تماس · تو {me.callsToday >= quality.teamAvgCalls ? 'بالاتر' : 'پایین‌تر'} از میانگینی
          </p>
        </section>

        <button
          onClick={() => navigate(nextAction.href)}
          className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-l from-primary-600 to-primary-500 p-4 text-right text-white shadow-float"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <nextAction.icon size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold text-white/70">الان چه کاری بکنم؟</span>
            <span className="mt-0.5 block truncate text-[13px] font-extrabold">{nextAction.text}</span>
          </span>
          <ChevronLeft size={18} className="shrink-0 text-white/70" />
        </button>

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
            {achievements.map((ach) => (
              <AchievementBadge
                key={ach.id}
                ach={ach}
                onClick={() => {
                  haptic('selection')
                  setSelectedAch(ach)
                }}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-extrabold text-neutral-900">
            <Zap size={16} className="text-accent-500" />
            چالش روزانه
          </h2>
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-secondary-500 to-secondary-600 p-5 text-white shadow-float">
            <div className="flex items-center justify-between gap-4">
              <p className="text-lg font-black">جایزه: ۵۰۰ امتیاز</p>
              <p className="text-3xl font-black tabular-nums shrink-0">{toFa(2)}/{toFa(3)}</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-2/3 rounded-full bg-white" />
            </div>
          </div>
        </section>

        <button
          onClick={() => navigate('/training')}
          className="flex items-center gap-3 rounded-2xl bg-primary-50 p-4 text-right"
        >
          <Sparkles size={20} className="shrink-0 text-primary-600" />
          <p className="flex-1 text-[13px] font-bold text-neutral-700">
            آموزش، اسکریپت فروش و پاسخ به اعتراض‌ها رو مرور کن
          </p>
          <ChevronLeft size={16} className="shrink-0 text-primary-300" />
        </button>
      </div>

      <AchievementSheet ach={selectedAch} onClose={() => setSelectedAch(null)} />
    </Page>
  )
}

function AchievementSheet({
  ach,
  onClose,
}: {
  ach: Achievement | null
  onClose: () => void
}) {
  return (
    <BottomSheet open={ach != null} onClose={onClose} title="دستاورد">
      {ach && (
        <div className="flex flex-col items-center pt-2 text-center">
          <AchievementBadgeIcon ach={ach} size="lg" />
          <h3 className="mt-4 text-xl font-black text-neutral-900">{ach.title}</h3>
          <p className="mt-2 text-[14px] leading-7 text-neutral-500">{ach.description}</p>
          <span
            className={cn(
              'mt-4 inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-bold',
              ach.unlocked ? 'bg-success-50 text-success-600' : 'bg-neutral-100 text-neutral-500',
            )}
          >
            {ach.unlocked ? 'باز شده' : 'هنوز باز نشده'}
          </span>
        </div>
      )}
    </BottomSheet>
  )
}

function QualityTile({
  icon: Icon,
  label,
  value,
  tone,
  warn,
  small,
}: {
  icon: typeof Clock
  label: string
  value: string | number
  tone: 'success' | 'secondary' | 'hot' | 'warning' | 'primary'
  warn?: boolean
  small?: boolean
}) {
  const toneClass = {
    success: 'bg-success-50 text-success-600',
    secondary: 'bg-secondary-50 text-secondary-600',
    hot: 'bg-hot-50 text-hot-600',
    warning: 'bg-warning-50 text-warning-600',
    primary: 'bg-primary-50 text-primary-600',
  }[tone]
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-2xl border p-3',
        warn ? 'border-warning-200 bg-warning-50/40' : 'border-border/60 bg-surface',
      )}
    >
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', toneClass)}>
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className={cn('font-black tabular-nums text-neutral-900', small ? 'text-[12.5px]' : 'text-[15px]')}>
          {value}
        </p>
        <p className="truncate text-[10.5px] font-bold text-neutral-400">{label}</p>
      </div>
    </div>
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
            <div
              key={agent.id}
              className="flex min-w-0 flex-1 flex-col items-center"
            >
              <div className="relative mb-2.5 flex flex-col items-center">
                {cfg.crown && (
                  <div className="mb-1">
                    <Crown size={17} className="text-warning-500" fill="currentColor" strokeWidth={1.5} />
                  </div>
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

              <div
                className={cn(
                  'mt-2.5 w-full rounded-t-2xl shadow-[inset_0_2px_6px_rgba(2,6,7,0.04)]',
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
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
