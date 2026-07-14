import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Target,
  Users,
  LogOut,
  Timer,
  PhoneOutgoing,
  Sparkles,
  CalendarDays,
  Coffee,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { availabilityDotClass, availabilityIcon } from '@/components/domain/icons'
import { AvailabilitySheet } from '@/components/domain/AvailabilitySwitcher'
import { filterLeadsForAgent } from '@/lib/leadUtils'
import { availabilityLabels } from '@/data/labels'
import { toFa, formatHms, formatJalaliShort } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'
import {
  calcDailyBreakSeconds,
  calcDailyCallSeconds,
  calcDailyProductiveSeconds,
  calcDailyActivitySeconds,
  dateKeyFromIso,
  isProductiveAvailability,
  isShiftOpen,
  todayDateKey,
} from '@/lib/shiftUtils'
import { performEndShift } from '@/services/shiftActions'
import { WorkPeriodSummaryCard } from '@/features/status/WorkPeriodSummaryCard'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'
const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }
const SHIFT_GOAL_SEC = 8 * 3600

type ShiftTier = 'early' | 'mid' | 'late' | 'premium'

function getShiftTier(elapsedSec: number): ShiftTier {
  if (elapsedSec >= SHIFT_GOAL_SEC) return 'premium'
  const p = elapsedSec / SHIFT_GOAL_SEC
  if (p < 0.33) return 'early'
  if (p < 0.66) return 'mid'
  return 'late'
}

const shiftHeroClass: Record<ShiftTier, string | null> = {
  early: null,
  mid: 'glass-hero-shift-mid',
  late: 'glass-hero-success',
  premium: 'glass-hero-premium',
}

const shiftGlowTop: Record<ShiftTier, string> = {
  early: 'bg-[#3390EC]/22',
  mid: 'bg-primary-400/26',
  late: 'bg-emerald-400/28',
  premium: 'bg-secondary-400/32',
}

const shiftGlowBottom: Record<ShiftTier, string> = {
  early: 'bg-[#8774E1]/18',
  mid: 'bg-emerald-300/16',
  late: 'bg-emerald-300/18',
  premium: 'bg-accent-400/22',
}

const shiftPulseBorder: Record<ShiftTier, string> = {
  early: 'border-[#3390EC]/30',
  mid: 'border-primary-400/32',
  late: 'border-emerald-400/30',
  premium: 'border-secondary-400/45',
}

function AnimatedShiftTimer({ totalSec }: { totalSec: number }) {
  const chars = formatHms(totalSec).split('')
  let digitIndex = 0

  return (
    <div className="ltr-nums flex items-center justify-center text-[36px] font-black tabular-nums leading-none tracking-tight text-text">
      {chars.map((char, i) => {
        const isDigit = /[۰-۹]/.test(char)
        if (!isDigit) {
          return (
            <span key={`sep-${i}`} className="inline-block w-[0.28em] text-center opacity-75">
              {char}
            </span>
          )
        }
        const position = digitIndex
        digitIndex += 1
        return <AnimatedDigit key={`d-${i}`} digit={char} position={position} />
      })}
    </div>
  )
}

function AnimatedDigit({ digit, position }: { digit: string; position: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={digit}
          initial={{ y: -16, opacity: 0, filter: 'blur(2px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: 16, opacity: 0, filter: 'blur(2px)' }}
          transition={{
            type: 'spring',
            stiffness: 520,
            damping: 32,
            delay: position * 0.014,
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: spring },
}

function StatTile({
  icon: Icon,
  iconWrap,
  iconClass,
  value,
  label,
  progress,
}: {
  icon: LucideIcon
  iconWrap: string
  iconClass: string
  value: string
  label: string
  progress?: number
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'glass-card relative overflow-hidden rounded-[22px] border border-white/55 p-4',
        'dark:border-white/10',
      )}
    >
      <div className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-[#3390EC]/10 blur-2xl dark:bg-[#8774E1]/12" />
      <span className={cn('icon-3d relative h-9 w-9', iconWrap)}>
        <Icon size={16} className={iconClass} strokeWidth={2.35} />
      </span>
      <p className="relative mt-2.5 text-[22px] font-black tabular-nums leading-none text-text">{value}</p>
      <p className="relative mt-1 text-[11px] font-semibold text-text-soft">{label}</p>
      {progress != null && (
        <div className="relative mt-2.5 h-[5px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-l from-[#3390EC] to-[#5EB0FF] dark:from-[#8774E1] dark:to-[#A894EE]"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, progress)}%` }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        </div>
      )}
    </motion.div>
  )
}

export function WorkStatusScreen() {
  const navigate = useNavigate()
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const currentAgentId = useStore((s) => s.currentAgentId)
  const availability = useStore((s) => s.availability)
  const availabilityChangedAt = useStore((s) => s.availabilityChangedAt)
  const workSession = useStore((s) => s.workSession)
  const workDaySummaries = useStore((s) => s.workDaySummaries)
  const calls = useStore((s) => s.calls)
  const leads = useStore((s) => s.leads)
  const pushToast = useStore((s) => s.pushToast)

  const [statusOpen, setStatusOpen] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const productiveSec = calcDailyProductiveSeconds(
    workDaySummaries,
    workSession,
    availability,
    availabilityChangedAt,
    now,
  )

  const activitySec = calcDailyActivitySeconds(
    workDaySummaries,
    workSession,
    availability,
    availabilityChangedAt,
    now,
  )

  const breakSec = calcDailyBreakSeconds(
    workDaySummaries,
    workSession,
    availability,
    availabilityChangedAt,
    now,
  )

  const callSec = calcDailyCallSeconds(
    workDaySummaries,
    workSession,
    availability,
    availabilityChangedAt,
    now,
  )

  const callSecFromCalls = useMemo(() => {
    const today = todayDateKey(new Date(now))
    return calls
      .filter(
        (call) =>
          call.agentId === currentAgentId &&
          dateKeyFromIso(call.createdAt) === today &&
          call.durationSec > 0,
      )
      .reduce((sum, call) => sum + call.durationSec, 0)
  }, [calls, currentAgentId, now])

  const displayCallSec = Math.max(callSec, callSecFromCalls)

  const recentWorkDays = useMemo(
    () => workDaySummaries.filter((day) => day.sessionsCount > 0).slice(0, 7),
    [workDaySummaries],
  )

  const myLeads = useMemo(
    () =>
      filterLeadsForAgent(leads, currentAgentId).filter(
        (l) => l.assignedAgentId === agent?.id && l.stage !== 'won' && l.stage !== 'lost',
      ),
    [leads, agent?.id, currentAgentId],
  )

  if (!agent) return null

  const Icon = availabilityIcon[availability]
  const goalPct = agent.callGoal ? Math.round((agent.callsToday / agent.callGoal) * 100) : 0
  const shiftActive = isShiftOpen(workSession)
  const shiftTier = getShiftTier(activitySec)
  const shiftProgressPct = Math.min(100, Math.round((activitySec / SHIFT_GOAL_SEC) * 100))
  const isPremiumShift = shiftTier === 'premium'
  const timerRunning = shiftActive && isProductiveAvailability(availability)

  return (
    <Page withNav={false}>
      <TopBar title="وضعیت کاری من" />

      <div className="space-y-5 px-4 pt-1 pb-6">
        {/* Shift hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, duration: 0.4 }}
          className={cn(
            'glass-hero relative overflow-hidden rounded-[26px] p-5 transition-[box-shadow,background] duration-700',
            availability === 'doing_follow_up' && 'border border-warning-300/45 bg-warning-50/75 dark:border-warning-400/25 dark:bg-warning-500/10',
            shiftActive && availability !== 'doing_follow_up' && shiftHeroClass[shiftTier],
            !shiftActive && productiveSec > 0 && availability !== 'doing_follow_up' && shiftHeroClass[shiftTier],
          )}
        >
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className={cn(
                'absolute -left-14 -top-16 h-48 w-48 rounded-full blur-3xl transition-colors duration-700',
                shiftActive ? shiftGlowTop[shiftTier] : 'bg-[#3390EC]/22',
              )}
            />
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.6, 0.9, 0.6] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
              className={cn(
                'absolute -bottom-16 -right-12 h-44 w-44 rounded-full blur-3xl transition-colors duration-700',
                shiftActive ? shiftGlowBottom[shiftTier] : 'bg-[#8774E1]/18',
              )}
            />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/75 to-transparent dark:via-white/12" />
          </div>

          <div className="relative flex items-center justify-between gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setStatusOpen(true)}
              className={cn(
                'glass-inset inline-flex max-w-[62%] items-center gap-2 rounded-full border px-3.5 py-2',
                availability === 'doing_follow_up'
                  ? 'border-warning-300/70 bg-warning-50/90 text-warning-900 dark:border-warning-400/30 dark:bg-warning-500/15 dark:text-warning-100'
                  : 'border-white/55 text-[12px] font-bold text-text dark:border-white/10',
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full ring-2 ring-white/70 dark:ring-black/20',
                  availabilityDotClass[availability],
                  shiftActive && availability === 'available' && 'notify-blink',
                )}
              />
              <Icon size={14} className={cn('shrink-0', TG)} strokeWidth={2.35} />
              <span className="truncate">{availabilityLabels[availability]}</span>
            </motion.button>

            <span
              className={cn(
                'glass-inset inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5',
                'border-white/50 text-[11px] font-bold text-text-muted dark:border-white/10',
                isPremiumShift && 'border-secondary-400/35 text-secondary-700 dark:text-secondary-300',
              )}
            >
              <Timer
                size={13}
                className={cn(
                  shiftActive && isPremiumShift && 'text-secondary-600 dark:text-secondary-400',
                  shiftActive && !isPremiumShift && shiftTier === 'late' && 'text-emerald-500',
                  shiftActive && !isPremiumShift && shiftTier !== 'late' && TG,
                  !shiftActive && TG,
                )}
                strokeWidth={2.35}
              />
              {shiftActive ? (isPremiumShift ? 'شیفت پریمیوم' : 'در شیفت') : 'خارج از شیفت'}
            </span>
          </div>

          <div className="relative mt-6 flex flex-col items-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-soft">
              <Sparkles
                size={12}
                className={isPremiumShift ? 'text-secondary-600 dark:text-secondary-400' : TG}
                strokeWidth={2.25}
              />
              {isPremiumShift
                ? 'بیش از ۸ ساعت فعالیت امروز'
                : `فعالیت امروز · ${toFa(shiftProgressPct)}٪ از ۸ ساعت`}
            </span>
            {shiftActive && (
              <span className="mt-1 text-[10px] font-semibold text-text-soft">
                {availability === 'on_break'
                  ? 'در استراحت — زمان شیفت همچنان ثبت می‌شود'
                  : availability === 'doing_follow_up'
                    ? 'مشغول پیگیری — زمان شیفت همچنان ثبت می‌شود'
                    : availability === 'in_call'
                      ? 'در تماس — زمان شیفت همچنان ثبت می‌شود'
                      : !timerRunning
                        ? 'زمان مولد متوقف است؛ کل شیفت همچنان ثبت می‌شود'
                        : 'تماس، پیگیری، استراحت و همه فعالیت‌های شیفت'}
              </span>
            )}
            {!shiftActive && activitySec > 0 && (
              <span className="mt-1 text-[10px] font-semibold text-text-soft">
                جمع کل فعالیت امروز (همه شیفت‌ها)
              </span>
            )}
            {!shiftActive && activitySec === 0 && (
              <span className="mt-1 text-[10px] font-semibold text-text-soft">
                با شروع شیفت، زمان فعالیت از همین‌جا جمع می‌شود
              </span>
            )}

            <div className="relative mt-3 flex h-[88px] w-[min(100%,280px)] items-center justify-center">
              <motion.span
                className={cn(
                  'pointer-events-none absolute inset-2 rounded-[22px] border-2 transition-colors duration-700',
                  activitySec > 0 || shiftActive ? shiftPulseBorder[shiftTier] : 'border-[#3390EC]/30',
                )}
                animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: isPremiumShift ? 1.6 : 2.2, repeat: Infinity, ease: 'easeOut' }}
              />
              <div
                className={cn(
                  'glass-inset relative flex h-full w-full items-center justify-center overflow-hidden rounded-[22px]',
                  'border border-white/55 dark:border-white/10',
                  isPremiumShift && 'glass-inset border-secondary-400/25',
                )}
              >
                <AnimatedShiftTimer totalSec={activitySec} />
              </div>
            </div>

            {!shiftActive && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/shift-start')}
                className={cn(
                  'relative mt-4 inline-flex h-10 items-center justify-center gap-2 overflow-hidden',
                  'rounded-[14px] px-5 text-[13px] font-bold text-white',
                  'bg-[#3390EC] shadow-[0_8px_24px_rgba(51,144,236,0.32)]',
                  'dark:bg-[#8774E1] dark:shadow-[0_8px_24px_rgba(135,116,225,0.28)]',
                )}
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/10" />
                <Sparkles size={15} strokeWidth={2.25} />
                <span className="relative">{activitySec > 0 ? 'ادامه شیفت' : 'شروع شیفت'}</span>
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
          <StatTile
            icon={Target}
            iconWrap="icon-3d-primary"
            iconClass="text-white"
            value={`${toFa(agent.callsToday)} / ${toFa(agent.callGoal)}`}
            label="هدف تماس امروز"
            progress={goalPct}
          />
          <StatTile
            icon={Users}
            iconWrap="icon-3d-warning"
            iconClass="text-[#1A1200]"
            value={toFa(myLeads.length)}
            label="مشتری فعال تخصیص‌یافته"
          />
          <StatTile
            icon={PhoneOutgoing}
            iconWrap="icon-3d-success"
            iconClass="text-white"
            value={formatHms(displayCallSec)}
            label="زمان مکالمه امروز"
          />
          <StatTile
            icon={Coffee}
            iconWrap="icon-3d-warning"
            iconClass="text-[#1A1200]"
            value={formatHms(breakSec)}
            label="استراحت امروز"
          />
          <StatTile
            icon={Timer}
            iconWrap="icon-3d-primary"
            iconClass="text-white"
            value={toFa(agent.successfulToday)}
            label="تماس موفق امروز"
          />
        </motion.div>

        {/* Work days summary */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.22 }}
          className={cn(
            'glass-card overflow-hidden rounded-[22px] border border-white/55 dark:border-white/10',
          )}
        >
          <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3.5 dark:border-white/8">
            <span className="icon-3d icon-3d-primary flex h-8 w-8 items-center justify-center">
              <CalendarDays size={15} className="text-white" strokeWidth={2.35} />
            </span>
            <div>
              <p className="text-[14px] font-black text-text">خلاصه روزهای کاری</p>
              <p className="text-[11px] font-semibold text-text-soft">۱۴ روز اخیر</p>
            </div>
          </div>

          {recentWorkDays.length === 0 ? (
            <p className="px-4 py-5 text-center text-[13px] font-semibold text-text-muted">
              هنوز روز کاری ثبت نشده
            </p>
          ) : (
            <div className="divide-y divide-white/35 dark:divide-white/8">
              {recentWorkDays.map((day) => (
                <div key={day.date} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-text">
                      {formatJalaliShort(new Date(`${day.date}T12:00:00`))}
                      {day.isOpen ? ' · امروز' : ''}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                      {toFa(day.sessionsCount)} شیفت · مکالمه {formatHms(day.totalCallSeconds)}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="ltr-nums text-[15px] font-black tabular-nums text-text">
                      {formatHms(day.totalProductiveSeconds)}
                    </p>
                    <p className="text-[10px] font-semibold text-text-soft">زمان مولد</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <WorkPeriodSummaryCard
          workDaySummaries={workDaySummaries}
          workSession={workSession}
          availability={availability}
          availabilityChangedAt={availabilityChangedAt}
          nowMs={now}
          calls={calls}
          agentId={currentAgentId}
        />

        {/* End shift */}
        {shiftActive && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.34 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              haptic('warning')
              performEndShift()
              pushToast('شیفت پایان یافت')
              navigate('/profile', { replace: true })
            }}
            className={cn(
              'relative flex h-[54px] w-full items-center justify-center gap-2 overflow-hidden',
              'rounded-[18px] border border-red-500/25 text-[15px] font-bold text-red-600',
              'bg-red-500/10 backdrop-blur-xl dark:border-red-400/20 dark:text-red-400 dark:bg-red-500/14',
              'shadow-[inset_0_0.5px_0_rgba(255,255,255,0.6),0_8px_24px_rgba(229,72,77,0.18)]',
            )}
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-red-900/5" />
            <LogOut size={18} className="relative" strokeWidth={2.35} />
            <span className="relative">پایان شیفت کاری</span>
          </motion.button>
        )}
      </div>

      <AvailabilitySheet open={statusOpen} onClose={() => setStatusOpen(false)} />
    </Page>
  )
}
