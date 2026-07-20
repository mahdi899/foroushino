import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
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
import { useRemoteDataReady } from '@/providers/SyncProvider'
import { apiMode } from '@/services'
import { WorkPeriodSummaryCard } from '@/features/status/WorkPeriodSummaryCard'

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }
const SHIFT_GOAL_SEC = 8 * 3600

type StatTone = 'primary' | 'blue' | 'green' | 'amber' | 'violet'

const statToneClass: Record<StatTone, string> = {
  primary: 'bg-primary-500/12 text-primary-600 dark:bg-primary-400/16 dark:text-primary-400',
  blue: 'bg-[#007AFF]/12 text-[#007AFF] dark:bg-[#0A84FF]/16 dark:text-[#0A84FF]',
  green: 'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-400/16 dark:text-emerald-400',
  amber: 'bg-amber-500/12 text-amber-600 dark:bg-amber-400/16 dark:text-amber-400',
  violet: 'bg-violet-500/12 text-violet-600 dark:bg-violet-400/16 dark:text-violet-400',
}

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

function AnimatedShiftTimer({ totalSec }: { totalSec: number }) {
  const safe = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  const segments = [
    toFa(String(h).padStart(2, '0')),
    toFa(String(m).padStart(2, '0')),
    toFa(String(s).padStart(2, '0')),
  ]

  let digitPosition = 0

  return (
    <div className="ltr-nums flex items-center justify-center gap-0.5 text-[38px] font-black tabular-nums leading-none text-text sm:text-[42px]">
      {segments.map((segment, segmentIndex) => (
        <div key={segmentIndex} className="flex items-center">
          {segmentIndex > 0 ? (
            <span
              aria-hidden
              className="mx-1 inline-flex w-[0.35em] items-center justify-center pb-1 text-[30px] font-bold opacity-55 sm:text-[34px]"
            >
              :
            </span>
          ) : null}
          <div className="flex items-center">
            {[...segment].map((char, charIndex) => {
              const position = digitPosition
              digitPosition += 1
              return (
                <AnimatedDigit
                  key={`${segmentIndex}-${charIndex}-${char}`}
                  digit={char}
                  position={position}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function AnimatedDigit({ digit, position }: { digit: string; position: number }) {
  return (
    <span className="relative inline-flex h-[1.1em] w-[0.72em] min-w-[26px] items-center justify-center overflow-hidden sm:min-w-[30px]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={digit}
          initial={{ y: -18, opacity: 0, filter: 'blur(2px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: 18, opacity: 0, filter: 'blur(2px)' }}
          transition={{
            type: 'spring',
            stiffness: 520,
            damping: 32,
            delay: position * 0.012,
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
  tone,
  value,
  label,
  progress,
}: {
  icon: LucideIcon
  tone: StatTone
  value: string
  label: string
  progress?: number
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'overflow-hidden rounded-[20px] border border-black/[0.04] bg-surface p-3.5',
        'shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-surface-elevated dark:shadow-none',
      )}
    >
      <motion.div
        className={cn('ios-action-icon !h-[34px] !w-[34px] !rounded-[10px]', statToneClass[tone])}
        whileTap={{ scale: 0.92 }}
        transition={spring}
      >
        <Icon size={17} strokeWidth={2.15} />
      </motion.div>
      <motion.p
        className="mt-3 text-[22px] font-bold tabular-nums leading-none tracking-tight text-text"
        key={value}
        initial={{ opacity: 0.6, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        {value}
      </motion.p>
      <p className="mt-1.5 text-[11px] font-medium leading-snug text-text-soft">{label}</p>
      {progress != null && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/10">
          <motion.div
            className="h-full rounded-full bg-primary-500 dark:bg-primary-400"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, progress)}%` }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      )}
    </motion.div>
  )
}

export function WorkStatusScreen() {
  const navigate = useNavigate()
  const { syncing } = useRemoteDataReady()
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

  if (!agent) {
    if (apiMode === 'http' && syncing) {
      return (
        <Page withNav={false}>
          <TopBar title="وضعیت کاری من" />
          <div className="flex justify-center py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        </Page>
      )
    }
    return <Navigate to="/login" replace />
  }

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

      <div className="space-y-4 px-4 pt-1 pb-6">
        {/* Shift hero */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, duration: 0.38 }}
          className={cn(
            'relative overflow-hidden rounded-[24px] border border-black/[0.04] p-5',
            'bg-surface shadow-[0_2px_14px_rgba(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-surface-elevated dark:shadow-none',
            availability === 'doing_follow_up' &&
              'border-warning-300/40 bg-warning-50/80 dark:border-warning-400/25 dark:bg-warning-500/10',
            shiftActive && availability !== 'doing_follow_up' && shiftHeroClass[shiftTier],
            !shiftActive && productiveSec > 0 && availability !== 'doing_follow_up' && shiftHeroClass[shiftTier],
          )}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className={cn(
                'absolute -left-16 -top-20 h-44 w-44 rounded-full blur-3xl opacity-60 transition-colors duration-700',
                shiftActive ? shiftGlowTop[shiftTier] : 'bg-primary-400/16',
              )}
            />
            <div
              className={cn(
                'absolute -bottom-20 -right-14 h-40 w-40 rounded-full blur-3xl opacity-50 transition-colors duration-700',
                shiftActive ? shiftGlowBottom[shiftTier] : 'bg-violet-400/12',
              )}
            />
          </div>

          <div className="relative flex items-center justify-between gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setStatusOpen(true)}
              className={cn(
                'inline-flex max-w-[62%] items-center gap-2 rounded-full px-3.5 py-2',
                'bg-black/[0.04] text-[12px] font-semibold text-text dark:bg-white/[0.08]',
                availability === 'doing_follow_up' &&
                  'bg-warning-500/14 text-warning-800 dark:text-warning-100',
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full ring-2 ring-white/80 dark:ring-black/25',
                  availabilityDotClass[availability],
                  shiftActive && availability === 'available' && 'notify-blink',
                )}
              />
              <Icon size={14} className="shrink-0 text-primary-600 dark:text-primary-400" strokeWidth={2.2} />
              <span className="truncate">{availabilityLabels[availability]}</span>
            </motion.button>

            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5',
                'bg-black/[0.04] text-[11px] font-semibold text-text-muted dark:bg-white/[0.08]',
                isPremiumShift && 'text-secondary-700 dark:text-secondary-300',
              )}
            >
              <Timer
                size={13}
                className={cn(
                  isPremiumShift && 'text-secondary-600 dark:text-secondary-400',
                  shiftActive && !isPremiumShift && shiftTier === 'late' && 'text-emerald-500',
                  shiftActive && !isPremiumShift && shiftTier !== 'late' && 'text-primary-600 dark:text-primary-400',
                  !shiftActive && 'text-primary-600 dark:text-primary-400',
                )}
                strokeWidth={2.2}
              />
              {shiftActive ? (isPremiumShift ? 'شیفت پریمیوم' : 'در شیفت') : 'خارج از شیفت'}
            </span>
          </div>

          <div className="relative mt-5 flex flex-col items-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-soft">
              <Sparkles
                size={12}
                className={isPremiumShift ? 'text-secondary-600 dark:text-secondary-400' : 'text-primary-600 dark:text-primary-400'}
                strokeWidth={2.15}
              />
              {isPremiumShift
                ? 'بیش از ۸ ساعت فعالیت امروز'
                : `فعالیت امروز · ${toFa(shiftProgressPct)}٪ از ۸ ساعت`}
            </span>
            {shiftActive && (
              <span className="mt-1 text-center text-[10px] font-medium text-text-muted">
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
              <span className="mt-1 text-[10px] font-medium text-text-muted">
                جمع کل فعالیت امروز (همه شیفت‌ها)
              </span>
            )}
            {!shiftActive && activitySec === 0 && (
              <span className="mt-1 text-[10px] font-medium text-text-muted">
                با شروع شیفت، زمان فعالیت از همین‌جا جمع می‌شود
              </span>
            )}

            <motion.div
              className="relative mt-4 flex h-[84px] w-[min(100%,272px)] items-center justify-center"
              layout
            >
              <div
                className={cn(
                  'relative flex h-full w-full items-center justify-center overflow-hidden rounded-[20px]',
                  'border border-black/[0.05] bg-black/[0.03] dark:border-white/[0.08] dark:bg-white/[0.04]',
                  isPremiumShift && 'border-secondary-400/25',
                )}
              >
                <AnimatedShiftTimer totalSec={activitySec} />
              </div>
            </motion.div>

            {!shiftActive && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/shift-start')}
                className={cn(
                  'relative mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full px-6',
                  'bg-primary-600 text-[13px] font-bold text-white shadow-[0_6px_20px_rgba(0,111,117,0.28)]',
                  'dark:bg-primary-500 dark:shadow-[0_6px_20px_rgba(0,160,170,0.32)]',
                )}
              >
                <Sparkles size={15} strokeWidth={2.15} />
                {activitySec > 0 ? 'ادامه شیفت' : 'شروع شیفت'}
              </motion.button>
            )}
          </div>
        </motion.section>

        {/* Stats grid */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-2.5">
          <StatTile
            icon={Target}
            tone="primary"
            value={`${toFa(agent.callsToday)} / ${toFa(agent.callGoal)}`}
            label="هدف تماس امروز"
            progress={goalPct}
          />
          <StatTile
            icon={Users}
            tone="blue"
            value={toFa(myLeads.length)}
            label="مشتری فعال تخصیص‌یافته"
          />
          <StatTile
            icon={PhoneOutgoing}
            tone="green"
            value={formatHms(displayCallSec)}
            label="زمان مکالمه امروز"
          />
          <StatTile
            icon={Coffee}
            tone="amber"
            value={formatHms(breakSec)}
            label="استراحت امروز"
          />
          <StatTile
            icon={Timer}
            tone="violet"
            value={toFa(agent.successfulToday)}
            label="تماس موفق امروز"
          />
        </motion.div>

        {/* Work days summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.18 }}
        >
          <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-text-muted">
            خلاصه روزهای کاری
          </p>
          <div className="ios-inset-group">
            <div className="flex items-center gap-2.5 px-3.5 py-3 ios-list-row-divider">
              <span className={cn('ios-action-icon', statToneClass.primary)}>
                <CalendarDays size={16} strokeWidth={2.15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-text">۱۴ روز اخیر</p>
                <p className="text-[11px] font-medium text-text-soft">زمان مولد هر روز</p>
              </div>
            </div>

            {recentWorkDays.length === 0 ? (
              <p className="px-4 py-5 text-center text-[13px] font-medium text-text-muted">
                هنوز روز کاری ثبت نشده
              </p>
            ) : (
              recentWorkDays.map((day, index) => (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: 0.04 * index }}
                  className={cn(
                    'flex items-center justify-between gap-3 px-3.5 py-3',
                    index < recentWorkDays.length - 1 && 'ios-list-row-divider',
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text">
                      {formatJalaliShort(new Date(`${day.date}T12:00:00`))}
                      {day.isOpen ? ' · امروز' : ''}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-text-soft">
                      {toFa(day.sessionsCount)} شیفت · مکالمه {formatHms(day.totalCallSeconds)}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="ltr-nums text-[15px] font-bold tabular-nums text-text">
                      {formatHms(day.totalProductiveSeconds)}
                    </p>
                    <p className="text-[10px] font-medium text-text-soft">زمان مولد</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.28 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              haptic('warning')
              performEndShift()
              pushToast('شیفت پایان یافت')
              navigate('/profile', { replace: true })
            }}
            className={cn(
              'flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px]',
              'bg-red-500/10 text-[15px] font-semibold text-red-600',
              'dark:bg-red-500/14 dark:text-red-400',
            )}
          >
            <LogOut size={18} strokeWidth={2.15} />
            پایان شیفت کاری
          </motion.button>
        )}
      </div>

      <AvailabilitySheet open={statusOpen} onClose={() => setStatusOpen(false)} />
    </Page>
  )
}
