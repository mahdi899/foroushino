import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame,
  Star,
  Target,
  Phone,
  CheckCircle2,
  Clock,
  TrendingUp,
  Trophy,
  Award,
  Sparkles,
  Zap,
  ThermometerSun,
  AlarmClock,
  NotebookPen,
  BadgeDollarSign,
  ChevronLeft,
  Gauge,
  BadgeCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { StatTile } from '@/components/domain/StatTile'
import { AgentMetricStatsPanel } from '@/components/domain/AgentMetricStatsPanel'
import { TeamRosterCard } from '@/components/domain/TeamRosterCard'
import { TeamPodium } from '@/components/domain/TeamPodium'
import { AchievementBadge, AchievementBadgeIcon } from '@/components/domain/AchievementBadge'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Avatar } from '@/components/ui/Avatar'
import { achievements } from '@/data/mock'
import { roleLabels } from '@/data/labels'
import { overdueFollowups } from '@/lib/leadUtils'
import { getAgentTeamPeersMonthly } from '@/lib/monthlyTopPerformers'
import { formatDuration, formatMoney, toFa } from '@/lib/format'
import { cn } from '@/lib/cn'
import { DataGate } from '@/components/pwa/DataGate'
import { haptic } from '@/lib/telegram'
import type { Achievement } from '@/types'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'
const OK = 'text-emerald-600 dark:text-emerald-400'
const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

const sectionStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: spring },
}

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-text">
      <span className="icon-3d icon-3d-primary flex h-7 w-7 items-center justify-center">
        <Icon size={14} className="text-white" strokeWidth={2.35} />
      </span>
      {children}
    </h2>
  )
}

export function PerformanceScreen() {
  const navigate = useNavigate()
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)
  const role = useStore((s) => s.role)
  const me = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const myId = useStore((s) => s.currentAgentId)
  const calls = useStore((s) => s.calls.filter((c) => c.agentId === myId))
  const leads = useStore((s) => s.leads)
  const followups = useStore((s) => s.followups.filter((f) => f.agentId === myId))
  const sales = useStore((s) => s.sales.filter((sl) => sl.agentId === myId))
  const commissions = useStore((s) => s.commissions.filter((c) => c.agentId === myId))
  const [selectedAch, setSelectedAch] = useState<Achievement | null>(null)

  const teamAgents = useMemo(() => {
    if (!me) return []
    return getAgentTeamPeersMonthly(me, agents, teams, myId, role)
  }, [me, agents, teams, myId, role])

  const myTeam = useMemo(
    () => (me?.teamId ? teams.find((team) => team.id === me.teamId) ?? null : null),
    [me?.teamId, teams],
  )

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
        text: `${toFa(quality.hotLeads)} مشتری داغ منتظر تماس توئه.`,
        href: '/leads?temp=hot',
        cta: 'مشاهده مشتریان داغ',
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
  const NextIcon = nextAction.icon

  return (
    <Page>
      <ScreenHeader
        title="عملکرد من"
        subtitle="پیشرفت و دستاوردهای امروز"
        icon={Trophy}
        iconTone="warning"
        showBack
        onBack={() => navigate('/profile')}
      />

      <DataGate mode="placeholder">
      <motion.div variants={sectionStagger} initial="hidden" animate="show" className="flex flex-col gap-6 px-4 pb-6">
        <motion.button
          type="button"
          variants={fadeUp}
          whileTap={{ scale: 0.985 }}
          onClick={() => {
            haptic('light')
            navigate('/profile')
          }}
          className={cn(
            'glass-card relative flex w-full items-center gap-3 overflow-hidden rounded-[22px]',
            'border border-white/60 p-3.5 text-right dark:border-white/10',
          )}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-6 top-0 h-20 w-20 rounded-full bg-[#3390EC]/12 blur-2xl" />
            <div className="absolute -right-4 bottom-0 h-16 w-16 rounded-full bg-[#8774E1]/10 blur-2xl" />
            <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/12" />
          </div>

          <Avatar
            id={me.id}
            first={me.firstName}
            last={me.lastName}
            src={me.avatar}
            size={48}
            ring
          />

          <div className="relative min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-[15px] font-bold text-text">
                {me.firstName} {me.lastName}
              </p>
              <BadgeCheck size={15} className="shrink-0 text-primary-500" strokeWidth={2.5} />
            </div>
            <p className="mt-0.5 truncate text-[12px] font-medium text-text-muted">
              {roleLabels[me.role]} · {toFa(me.points)} امتیاز
            </p>
          </div>

          <span className="relative flex shrink-0 flex-col items-center gap-0.5 text-[10px] font-semibold text-text-soft">
            <ChevronLeft size={16} className="opacity-50" strokeWidth={2.25} />
            پروفایل
          </span>
        </motion.button>

        <motion.div
          variants={fadeUp}
          className={cn(
            'glass-hero relative overflow-hidden rounded-[26px] p-5',
            goalComplete && 'glass-hero-success',
          )}
        >
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className={cn(
                'absolute -left-14 -top-16 h-48 w-48 rounded-full blur-3xl',
                goalComplete ? 'bg-emerald-400/24' : 'bg-[#3390EC]/20',
              )}
            />
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.6, 0.9, 0.6] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
              className="absolute -bottom-16 -right-12 h-44 w-44 rounded-full bg-[#8774E1]/16 blur-3xl"
            />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/75 to-transparent dark:via-white/12" />
          </div>

          <div className="relative flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'glass-inset inline-flex items-center gap-1.5 rounded-full border px-3 py-1',
                    'border-[#3390EC]/20 text-[11px] font-semibold dark:border-[#8774E1]/25',
                    TG,
                  )}
                >
                  <Target size={12} strokeWidth={2.35} />
                  هدف روزانه
                </span>
                {me.streak > 0 && (
                  <span className="glass-inset inline-flex items-center gap-1 rounded-full border border-orange-500/20 px-2.5 py-1 text-[11px] font-semibold text-orange-600 dark:text-orange-300">
                    <Flame size={13} strokeWidth={2.35} />
                    {toFa(me.streak)} روز
                  </span>
                )}
                <span className="glass-inset inline-flex items-center gap-1 rounded-full border border-white/55 px-2.5 py-1 text-[11px] font-semibold text-text-muted dark:border-white/10">
                  <Star size={13} className={TG} strokeWidth={2.35} />
                  {toFa(me.points)} امتیاز
                </span>
              </div>

              <div className="mt-4 max-w-[210px]">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold">
                  <span className="text-text-soft">پیشرفت امروز</span>
                  <span className="shrink-0 tabular-nums text-text">
                    {toFa(me.callsToday)}
                    <span className="text-text-soft"> / </span>
                    {toFa(me.callGoal)}
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
                    initial={{ width: 0 }}
                    animate={{ width: `${barPct}%` }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>

            <div
              className={cn(
                'glass-inset relative flex h-[76px] w-[76px] shrink-0 items-center justify-center',
                'rounded-[20px] border border-white/55 dark:border-white/10',
              )}
            >
              {goalComplete ? (
                <CheckCircle2 size={34} className={OK} strokeWidth={2.25} />
              ) : (
                <div className="flex flex-col items-center">
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={remaining}
                      initial={{ y: 6, scale: 0.8, opacity: 0 }}
                      animate={{ y: 0, scale: 1, opacity: 1 }}
                      className={cn('text-[26px] font-black tabular-nums leading-none', TG)}
                    >
                      {toFa(remaining)}
                    </motion.span>
                  </AnimatePresence>
                  <span className="mt-0.5 text-[10px] font-semibold text-text-soft">تماس مانده</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.section variants={fadeUp}>
          <SectionTitle icon={TrendingUp}>خلاصه عملکرد امروز</SectionTitle>
          <div className="grid grid-cols-4 gap-2">
            <StatTile variant="compact" icon={<Phone size={16} />} value={me.callsToday} label="تماس‌ها" />
            <StatTile variant="compact" icon={<CheckCircle2 size={16} />} value={me.successfulToday} label="موفق" tone="success" />
            <StatTile variant="compact" icon={<Target size={16} />} value={`${toFa(me.conversionRate)}٪`} label="نرخ تبدیل" tone="secondary" />
            <StatTile variant="compact" icon={<Clock size={16} />} value={formatDuration(quality.avgTalkSec)} label="میانگین مکالمه" tone="accent" />
          </div>
        </motion.section>

        <motion.section variants={fadeUp}>
          <SectionTitle icon={Gauge}>کیفیت تماس و پیگیری</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
            <QualityTile icon={CheckCircle2} label="نرخ پاسخ‌دهی" value={`${toFa(quality.answerRate)}٪`} iconWrap="icon-3d-success" />
            <QualityTile icon={NotebookPen} label="کیفیت یادداشت" value={`${toFa(quality.noteQuality)}٪`} iconWrap="icon-3d-warning" />
            <QualityTile icon={ThermometerSun} label="مشتریان داغ من" value={toFa(quality.hotLeads)} iconWrap="icon-3d-primary" warn={quality.hotLeads > 0} />
            <QualityTile icon={AlarmClock} label="پیگیری عقب‌افتاده" value={toFa(quality.overdue)} iconWrap="icon-3d-warning" warn={quality.overdue > 0} />
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <QualityTile icon={Trophy} label="فروش تاییدشده" value={toFa(quality.confirmedSales)} iconWrap="icon-3d-primary" />
            <QualityTile icon={BadgeDollarSign} label="پورسانت تاییدشده" value={`${formatMoney(quality.approvedCommission)} ت`} iconWrap="icon-3d-success" small />
          </div>
          <p className="mt-2.5 px-1 text-[11px] font-semibold text-text-soft">
            میانگین تماس امروز تیم: {toFa(quality.teamAvgCalls)} تماس · تو {me.callsToday >= quality.teamAvgCalls ? 'بالاتر' : 'پایین‌تر'} از میانگینی
          </p>
        </motion.section>

        <motion.button
          variants={fadeUp}
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate(nextAction.href)}
          className={cn(
            'glass-card relative flex w-full items-center gap-3 overflow-hidden rounded-[22px]',
            'border border-white/55 p-4 text-right dark:border-white/10',
          )}
        >
          <div className="pointer-events-none absolute -left-8 top-0 h-24 w-24 rounded-full bg-[#3390EC]/12 blur-3xl" />
          <span className="icon-3d icon-3d-primary relative flex h-10 w-10 shrink-0 items-center justify-center">
            <NextIcon size={18} className="text-white" strokeWidth={2.35} />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-text-soft">الان چه کاری بکنم؟</span>
            <span className="mt-0.5 block truncate text-[13px] font-bold text-text">{nextAction.text}</span>
          </span>
          <ChevronLeft size={18} className="relative shrink-0 text-text-soft opacity-45" strokeWidth={2.25} />
        </motion.button>

        <motion.section variants={fadeUp}>
          <SectionTitle icon={Gauge}>آمار امروز</SectionTitle>
          {myId ? <AgentMetricStatsPanel agentId={myId} embedded /> : null}
        </motion.section>

        {teamAgents.length > 0 ? (
          <motion.section variants={fadeUp}>
            <SectionTitle icon={Trophy}>برترین‌های این ماه</SectionTitle>
            <div className="glass-card overflow-hidden rounded-[24px] border border-white/55 p-4 pt-5 dark:border-white/10">
              <TeamPodium podium={teamAgents.slice(0, 3)} meId={me.id} variant="default" embedded />
            </div>
          </motion.section>
        ) : null}

        <motion.section variants={fadeUp}>
          <SectionTitle icon={Users}>تیم من</SectionTitle>
          {myTeam && myId ? <TeamRosterCard team={myTeam} agents={agents} meId={myId} /> : null}
        </motion.section>

        <motion.section variants={fadeUp}>
          <SectionTitle icon={Award}>دستاوردهای من</SectionTitle>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
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
        </motion.section>

        <motion.section variants={fadeUp}>
          <SectionTitle icon={Zap}>چالش روزانه</SectionTitle>
          <div className="glass-card relative overflow-hidden rounded-[24px] border border-amber-500/20 p-5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="relative flex items-center justify-between gap-4">
              <p className="text-[17px] font-black text-text">جایزه: ۵۰۰ امتیاز</p>
              <p className="shrink-0 text-[28px] font-black tabular-nums text-amber-600 dark:text-amber-400">
                {toFa(2)}/{toFa(3)}
              </p>
            </div>
            <div className="relative mt-3 h-[5px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
              <motion.div
                className="h-full w-2/3 rounded-full bg-gradient-to-l from-amber-400 to-amber-500"
                initial={{ width: 0 }}
                animate={{ width: '66.666%' }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.section>

        <motion.button
          variants={fadeUp}
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate('/training')}
          className={cn(
            'glass-inset flex items-center gap-3 rounded-[20px] border border-white/55 p-4 text-right',
            'dark:border-white/10',
          )}
        >
          <Sparkles size={20} className={cn('shrink-0', TG)} strokeWidth={2.25} />
          <p className="flex-1 text-[13px] font-semibold text-text-muted">
            آموزش، اسکریپت فروش و پاسخ به اعتراض‌ها رو مرور کن
          </p>
          <ChevronLeft size={16} className="shrink-0 text-text-soft opacity-45" strokeWidth={2.25} />
        </motion.button>
      </motion.div>
      </DataGate>

      <AchievementSheet ach={selectedAch} onClose={() => setSelectedAch(null)} />
    </Page>
  )
}

function AchievementSheet({ ach, onClose }: { ach: Achievement | null; onClose: () => void }) {
  return (
    <BottomSheet open={ach != null} onClose={onClose} title="دستاورد">
      {ach && (
        <div className="flex flex-col items-center pt-2 text-center">
          <AchievementBadgeIcon ach={ach} size="lg" />
          <h3 className="mt-4 text-xl font-black text-text">{ach.title}</h3>
          <p className="mt-2 text-[14px] leading-7 text-text-muted">{ach.description}</p>
          <span
            className={cn(
              'mt-4 inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-bold',
              ach.unlocked
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'glass-inset border-white/55 text-text-soft dark:border-white/10',
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
  iconWrap,
  warn,
  small,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  iconWrap: string
  warn?: boolean
  small?: boolean
}) {
  return (
    <div
      className={cn(
        'glass-card flex items-center gap-2.5 rounded-[18px] border p-3',
        warn ? 'border-amber-500/25 dark:border-amber-400/20' : 'border-white/55 dark:border-white/10',
      )}
    >
      <span className={cn('icon-3d flex h-9 w-9 shrink-0 items-center justify-center', iconWrap)}>
        <Icon size={16} className="text-white" strokeWidth={2.35} />
      </span>
      <div className="min-w-0">
        <p className={cn('font-black tabular-nums text-text', small ? 'text-[12.5px]' : 'text-[15px]')}>{value}</p>
        <p className="truncate text-[10.5px] font-semibold text-text-soft">{label}</p>
      </div>
    </div>
  )
}
