import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  PhoneCall,
  Trophy,
  Phone,
  CheckCircle2,
  Clock,
  Crown,
  Sparkles,
  PhoneOff,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { haptic } from '@/lib/telegram'
import { formatPhone, toFa } from '@/lib/format'
import { SAAT_LOGO_ALT, SAAT_LOGO_SRC } from '@/lib/brand'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'

/** Curated demo portraits for onboarding previews */
const ONBOARDING_AVATARS = {
  lead: '/avatars/ir-06.jpg',
  gold: '/avatars/ir-25.jpg',
  silver: '/avatars/ir-19.jpg',
  bronze: '/avatars/ir-04.jpg',
} as const

const spring = { type: 'spring' as const, stiffness: 420, damping: 32 }
const popSpring = { type: 'spring' as const, stiffness: 560, damping: 26 }

const slides = [
  {
    id: 'next-call',
    icon: PhoneCall,
    accent: '#3390EC',
    accentDark: '#8774E1',
    title: 'تماس بعدی همیشه آماده‌ست',
    body: 'سیستم بهترین مشتری را برایت انتخاب می‌کند تا فقط روی فروش تمرکز کنی.',
  },
  {
    id: 'quick-result',
    icon: Target,
    accent: '#31B545',
    accentDark: '#34D399',
    title: 'نتیجه را سریع ثبت کن',
    body: 'بعد از هر تماس، با چند لمس نتیجه و پیگیری بعدی را ثبت کن.',
  },
  {
    id: 'team-rank',
    icon: Trophy,
    accent: '#FFB000',
    accentDark: '#FBBF24',
    title: 'با تیم رقابت کن',
    body: 'هدف روزانه، امتیاز و رتبه‌بندی تیمی به تو انگیزه می‌دهد.',
  },
] as const

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 48 : -48,
    opacity: 0,
    scale: 0.94,
    filter: 'blur(6px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -48 : 48,
    opacity: 0,
    scale: 0.94,
    filter: 'blur(6px)',
  }),
}

function NextCallPreview() {
  const demoPhone = '09123456789'

  return (
    <div className="relative w-full px-1">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.08 }}
        className="glass-card relative overflow-hidden rounded-[24px] border border-white/60 p-4 dark:border-white/10"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-6 top-4 h-24 w-24 rounded-full bg-[#3390EC]/16 blur-2xl" />
          <div className="absolute -bottom-8 -right-4 h-20 w-20 rounded-full bg-[#8774E1]/12 blur-2xl" />
          <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/12" />
        </div>

        <div className="relative mb-3 flex items-center justify-between">
          <span className="glass-inset inline-flex items-center gap-1.5 rounded-full border border-white/55 px-2.5 py-1 text-[10px] font-semibold text-[#707579] dark:border-white/10 dark:text-[#8E9396]">
            <Target size={11} className={TG} />
            مشتری بعدی
          </span>
          <motion.span
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex items-center gap-1 rounded-full border border-[#3390EC]/25 bg-[#3390EC]/10 px-2 py-0.5 text-[9px] font-bold text-[#3390EC] dark:border-[#8774E1]/30 dark:bg-[#8774E1]/14 dark:text-[#8774E1]"
          >
            <Sparkles size={9} />
            پیشنهاد هوشمند
          </motion.span>
        </div>

        <div className="relative flex items-center gap-3 rounded-[16px] border border-white/50 bg-white/45 p-3 dark:border-white/8 dark:bg-white/5">
          <div className="relative h-11 w-11 shrink-0" dir="ltr">
            <img
              src={ONBOARDING_AVATARS.lead}
              alt="سارا محمدی"
              className="h-11 w-11 rounded-full object-cover object-top ring-2 ring-white/70 dark:ring-white/10"
              draggable={false}
            />
            <motion.div
              animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#3390EC]/40 dark:border-[#8774E1]/40"
            />
          </div>
          <div className="min-w-0 flex-1 text-right">
            <p className="truncate text-[13px] font-semibold text-[#000000] dark:text-[#F5F5F5]">
              سارا محمدی
            </p>
            <div
              dir="ltr"
              className="mt-1 inline-flex max-w-full items-center gap-1 rounded-lg bg-white/50 px-2 py-0.5 dark:bg-white/[0.07]"
            >
              <Phone size={10} className={cn('shrink-0', TG)} strokeWidth={2.35} />
              <span className="truncate text-[11px] font-semibold tabular-nums tracking-wide text-[#707579] dark:text-[#8E9396]">
                {formatPhone(demoPhone)}
              </span>
            </div>
          </div>
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3390EC] shadow-[0_8px_20px_-6px_rgba(51,144,236,0.55)] dark:bg-[#8774E1] dark:shadow-[0_8px_20px_-6px_rgba(135,116,225,0.5)]"
          >
            <Phone size={16} className="text-white" strokeWidth={2.5} />
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

type ResultChoice = 'answered' | 'no_answer' | 'follow_up'

const resultOptions: {
  id: ResultChoice
  label: string
  icon: typeof CheckCircle2
  activeClass: string
}[] = [
  {
    id: 'answered',
    label: 'پاسخ داد',
    icon: CheckCircle2,
    activeClass:
      'border-[#31B545]/35 bg-[#31B545]/12 text-[#31B545] shadow-[0_6px_16px_-8px_rgba(49,181,69,0.5)] dark:border-[#34D399]/35 dark:bg-[#34D399]/14 dark:text-[#34D399]',
  },
  {
    id: 'no_answer',
    label: 'بی‌پاسخ',
    icon: PhoneOff,
    activeClass:
      'border-[#E53935]/35 bg-[#E53935]/10 text-[#E53935] shadow-[0_6px_16px_-8px_rgba(229,57,53,0.45)] dark:border-[#FF5C66]/35 dark:bg-[#FF5C66]/12 dark:text-[#FF5C66]',
  },
  {
    id: 'follow_up',
    label: 'پیگیری',
    icon: Clock,
    activeClass:
      'border-[#FFB000]/35 bg-[#FFB000]/12 text-[#B45309] shadow-[0_6px_16px_-8px_rgba(255,176,0,0.45)] dark:border-[#FBBF24]/35 dark:bg-[#FBBF24]/14 dark:text-[#FBBF24]',
  },
]

const resultOutcomes: Record<
  ResultChoice,
  { message: string; followLabel: string; followValue: string; tone: string }
> = {
  answered: {
    message: 'نتیجه تماس ثبت شد',
    followLabel: 'پیگیری بعدی',
    followValue: `فردا ${toFa('10:30')}`,
    tone: 'text-[#31B545] dark:text-[#34D399]',
  },
  no_answer: {
    message: 'تماس مجدد زمان‌بندی شد',
    followLabel: 'تلاش بعدی',
    followValue: `امروز ${toFa('17:00')}`,
    tone: 'text-[#E53935] dark:text-[#FF5C66]',
  },
  follow_up: {
    message: 'یادآور پیگیری فعال شد',
    followLabel: 'موعد پیگیری',
    followValue: `پس‌فردا ${toFa('11:00')}`,
    tone: 'text-[#B45309] dark:text-[#FBBF24]',
  },
}

function QuickResultPreview() {
  const [selected, setSelected] = useState<ResultChoice>('answered')
  const outcome = resultOutcomes[selected]

  return (
    <div className="relative w-full px-1">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.08 }}
        className="glass-card relative overflow-hidden rounded-[24px] border border-white/60 p-4 dark:border-white/10"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-6 top-2 h-24 w-24 rounded-full bg-[#31B545]/14 blur-2xl" />
          <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/12" />
        </div>

        <p className="relative mb-3 text-center text-[11px] font-semibold text-[#707579] dark:text-[#8E9396]">
          نتیجه تماس — یکی را انتخاب کن
        </p>

        <div className="relative flex flex-wrap justify-center gap-2">
          {resultOptions.map(({ id, label, icon: Icon, activeClass }, i) => {
            const active = selected === id
            return (
              <motion.button
                key={id}
                type="button"
                initial={{ opacity: 0, scale: 0.85, y: 10 }}
                animate={{ opacity: 1, scale: active ? 1.04 : 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.07, ...popSpring }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  haptic('selection')
                  setSelected(id)
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors',
                  active
                    ? activeClass
                    : 'glass-inset border-white/55 text-[#707579] dark:border-white/10 dark:text-[#8E9396]',
                )}
              >
                <Icon size={12} strokeWidth={2.4} />
                {label}
              </motion.button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ ...spring }}
            className="relative mt-3 overflow-hidden rounded-[14px] border border-white/50 bg-white/40 px-3 py-2.5 dark:border-white/8 dark:bg-white/5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#707579] dark:text-[#8E9396]">{outcome.followLabel}</span>
              <span className={cn('text-[11px] font-bold tabular-nums', outcome.tone)}>
                {outcome.followValue}
              </span>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.06 }}
              className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-[#000000] dark:text-[#F5F5F5]"
            >
              <CheckCircle2 size={12} className={outcome.tone} />
              {outcome.message}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

const podiumMembers = [
  {
    rank: 2,
    name: 'نگین احمدی',
    you: true,
    score: 128,
    avatar: ONBOARDING_AVATARS.silver,
    podiumH: 'h-[52px]',
    medal: 'silver',
  },
  {
    rank: 1,
    name: 'امیرحسین رضایی',
    you: false,
    score: 142,
    avatar: ONBOARDING_AVATARS.gold,
    podiumH: 'h-[72px]',
    medal: 'gold',
  },
  {
    rank: 3,
    name: 'فاطمه حصاری',
    you: false,
    score: 115,
    avatar: ONBOARDING_AVATARS.bronze,
    podiumH: 'h-[40px]',
    medal: 'bronze',
  },
] as const

const medalColors = {
  gold: 'from-[#FFD700] to-[#FFB000]',
  silver: 'from-[#D1D5DB] to-[#9CA3AF]',
  bronze: 'from-[#F59E0B] to-[#D97706]',
}

function RibbonBurst() {
  const ribbons = [
    { x: -28, delay: 0, rotate: -24, color: '#FFD700' },
    { x: 28, delay: 0.15, rotate: 24, color: '#FFB000' },
    { x: -14, delay: 0.3, rotate: -12, color: '#8774E1' },
    { x: 14, delay: 0.45, rotate: 12, color: '#3390EC' },
    { x: 0, delay: 0.6, rotate: 0, color: '#FF6B00' },
  ]

  return (
    <div className="pointer-events-none absolute -top-1 left-1/2 h-16 w-20 -translate-x-1/2">
      {ribbons.map(({ x, delay, rotate, color }, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 8, scaleY: 0.3 }}
          animate={{ opacity: [0, 1, 0.7, 0], y: [-4, -22, -34], scaleY: [0.3, 1, 0.8] }}
          transition={{ duration: 2.2, repeat: Infinity, delay, ease: 'easeOut' }}
          className="absolute bottom-0 left-1/2 h-7 w-1.5 origin-bottom rounded-full"
          style={{
            marginLeft: x,
            rotate: `${rotate}deg`,
            background: `linear-gradient(to top, ${color}, transparent)`,
          }}
        />
      ))}
    </div>
  )
}

function PodiumPreview() {
  return (
    <div className="relative w-full px-1">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.08 }}
        className="glass-card relative overflow-hidden rounded-[24px] border border-white/60 p-4 pt-5 dark:border-white/10"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-4 bottom-0 h-24 w-24 rounded-full bg-[#FFB000]/16 blur-2xl" />
          <div className="absolute -right-6 top-0 h-20 w-20 rounded-full bg-[#8774E1]/12 blur-2xl" />
          <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/12" />
        </div>

        <div className="relative mb-4 flex items-center justify-center gap-1.5">
          <Trophy size={14} className="text-[#FFB000] dark:text-[#FBBF24]" />
          <span className="text-[11px] font-semibold text-[#707579] dark:text-[#8E9396]">
            سکوی افتخار امروز
          </span>
        </div>

        <div dir="ltr" className="relative flex items-end justify-center gap-2 px-1">
          {podiumMembers.map((member, i) => {
            const isFirst = member.rank === 1
            const avatarSize = isFirst ? 48 : 40
            return (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1, ...spring }}
                className="relative flex w-[30%] flex-col items-center"
              >
                {isFirst && (
                  <>
                    <RibbonBurst />
                    <motion.div
                      animate={{ y: [0, -3, 0], rotate: [-4, 4, -4] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      className="relative z-[2] mb-1"
                    >
                      <Crown
                        size={18}
                        className="text-[#FFD700] drop-shadow-[0_2px_6px_rgba(255,176,0,0.55)]"
                        fill="#FFD700"
                        strokeWidth={1.5}
                      />
                    </motion.div>
                  </>
                )}

                <div
                  className="relative mb-2 flex justify-center"
                  style={{ width: avatarSize, height: avatarSize }}
                >
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className={cn(
                      'rounded-full object-cover object-top ring-2',
                      isFirst ? 'h-12 w-12 ring-[#FFD700]/70' : 'h-10 w-10 ring-white/60 dark:ring-white/15',
                    )}
                    draggable={false}
                  />
                  <span
                    className={cn(
                      'absolute -bottom-1 left-1/2 z-[1] flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-black leading-none text-white shadow-sm ring-2 ring-white/80 dark:ring-[#17212B]/80',
                      medalColors[member.medal],
                    )}
                  >
                    {toFa(member.rank)}
                  </span>
                </div>

                <p className="mb-0.5 max-w-full truncate text-center text-[10px] font-bold text-[#000000] dark:text-[#F5F5F5]">
                  {member.name}
                  {member.you && (
                    <span className="mr-0.5 text-[9px] font-semibold text-[#3390EC] dark:text-[#8774E1]">
                      (تو)
                    </span>
                  )}
                </p>
                <p className="mb-2 text-[10px] font-bold tabular-nums text-[#FFB000] dark:text-[#FBBF24]">
                  {toFa(member.score)} امتیاز
                </p>

                <div
                  className={cn(
                    'relative w-full overflow-hidden rounded-t-[10px] border border-b-0 border-white/50 dark:border-white/10',
                    member.podiumH,
                  )}
                >
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-t opacity-90',
                      medalColors[member.medal],
                    )}
                  />
                  <div className="absolute inset-x-2 top-0 h-px bg-white/50" />
                  {isFirst && (
                    <motion.div
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-gradient-to-t from-transparent via-white/25 to-transparent"
                    />
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

function SlidePreview({ id }: { id: (typeof slides)[number]['id'] }) {
  if (id === 'next-call') return <NextCallPreview />
  if (id === 'quick-result') return <QuickResultPreview />
  return <PodiumPreview />
}

export function OnboardingScreen() {
  const navigate = useNavigate()
  const [[index, direction], setSlide] = useState([0, 0])
  const slide = slides[index]
  const Icon = slide.icon
  const last = index === slides.length - 1

  const paginate = useCallback(
    (newDirection: number) => {
      const next = index + newDirection
      if (next < 0 || next >= slides.length) return
      haptic('selection')
      setSlide([next, newDirection])
    },
    [index],
  )

  const goNext = useCallback(() => {
    if (last) {
      haptic('success')
      navigate('/login', { replace: true })
      return
    }
    paginate(1)
  }, [last, navigate, paginate])

  const skip = useCallback(() => {
    haptic('light')
    navigate('/login', { replace: true })
  }, [navigate])

  return (
    <div className="relative flex h-full min-h-full flex-col overflow-hidden bg-[#FFFFFF] dark:bg-[#17212B]">
      {/* Ambient glass orbs — Telegram / iOS style */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 12, 0], y: [0, -8, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#3390EC]/12 blur-3xl dark:bg-[#8774E1]/16"
        />
        <motion.div
          animate={{ x: [0, -10, 0], y: [0, 10, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#8774E1]/10 blur-3xl dark:bg-[#3390EC]/12"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.65, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-[#31B545]/8 blur-3xl"
        />
      </div>

      <div className="relative z-10 flex h-full min-h-full flex-col px-5 pt-[calc(8px+var(--safe-top))] pb-[calc(20px+var(--safe-bottom))]">
        <header className="flex h-10 shrink-0 items-center justify-between">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring, delay: 0.02 }}
          >
            <img
              src={SAAT_LOGO_SRC}
              alt={SAAT_LOGO_ALT}
              className="h-auto w-[72px] object-contain opacity-90"
              draggable={false}
            />
          </motion.div>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            whileTap={{ scale: 0.96 }}
            onClick={skip}
            className="rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-[#707579] active:text-[#3390EC] dark:text-[#8E9396] dark:active:text-[#8774E1]"
          >
            رد کردن
          </motion.button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col justify-center py-4">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slide.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={(_, info) => {
                const swipe = info.offset.x
                const velocity = info.velocity.x
                if (swipe < -60 || velocity < -400) goNext()
                else if (swipe > 60 || velocity > 400) paginate(-1)
              }}
              className="flex flex-col items-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...popSpring, delay: 0.04 }}
                className="relative mb-5"
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="glass-hero relative flex h-[72px] w-[72px] items-center justify-center rounded-[22px] border border-white/60 dark:border-white/10"
                  style={{
                    boxShadow: `0 14px 36px -12px ${slide.accent}55`,
                  }}
                >
                  <Icon
                    size={34}
                    strokeWidth={2.2}
                    className={TG}
                    style={{ color: slide.accent }}
                  />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0, 0.35] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-[22px] border-2"
                  style={{ borderColor: `${slide.accent}44` }}
                />
              </motion.div>

              <div className="mb-5 w-full max-w-[320px]">
                <SlidePreview id={slide.id} />
              </div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.14 }}
                className="max-w-[300px] text-center text-[22px] font-semibold leading-snug text-[#000000] dark:text-[#F5F5F5]"
              >
                {slide.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.2 }}
                className="mt-2.5 max-w-[290px] text-center text-[15px] leading-[1.6] text-[#707579] dark:text-[#8E9396]"
              >
                {slide.body}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.footer
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
          className="shrink-0 space-y-4"
        >
          <div className="flex items-center justify-center gap-1.5">
            {slides.map((_, i) => (
              <motion.button
                key={i}
                type="button"
                aria-label={`اسلاید ${toFa(i + 1)}`}
                onClick={() => {
                  if (i === index) return
                  haptic('selection')
                  setSlide([i, i > index ? 1 : -1])
                }}
                animate={{ width: i === index ? 24 : 6 }}
                transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                className={cn(
                  'h-1.5 rounded-full transition-colors duration-300',
                  i === index
                    ? 'bg-[#3390EC] dark:bg-[#8774E1]'
                    : 'bg-black/12 dark:bg-white/20',
                )}
              />
            ))}
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={goNext}
            className={cn(
              'flex h-[50px] w-full items-center justify-center rounded-[12px] text-[16px] font-semibold text-white',
              'bg-[#3390EC] active:bg-[#2B7FD4] dark:bg-[#8774E1] dark:active:bg-[#7563D4]',
              'shadow-[0_10px_28px_-10px_rgba(51,144,236,0.55)] dark:shadow-[0_10px_28px_-10px_rgba(135,116,225,0.5)]',
            )}
          >
            {last ? 'شروع کنیم' : 'بعدی'}
          </motion.button>
        </motion.footer>
      </div>
    </div>
  )
}
