import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { AppHeader } from './AppHeader'
import { NextCallCard } from '@/components/domain/NextCallCard'
import { GoalCelebration } from '@/components/domain/GoalCelebration'
import { EmptyState } from '@/components/ui/States'
import { rankSuggestions } from '@/services/logic'
import { filterLeadsForAgent } from '@/lib/leadUtils'
import { toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'
import { DataGate } from '@/components/pwa/DataGate'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'
const OK = 'text-emerald-600 dark:text-emerald-400'

const quickSpring = { type: 'spring' as const, stiffness: 520, damping: 28 }
const popSpring = { type: 'spring' as const, stiffness: 640, damping: 24 }

function AnimatedGoalCheck() {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...popSpring, duration: 0.35 }}
      className="relative flex h-12 w-12 items-center justify-center"
    >
      <motion.span
        className="absolute inset-0 rounded-full bg-emerald-400/25"
        initial={{ scale: 0.8, opacity: 0.8 }}
        animate={{ scale: 1.45, opacity: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />
      <svg viewBox="0 0 48 48" className="relative h-11 w-11" aria-hidden>
        <motion.circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-emerald-500"
          initial={{ pathLength: 0, opacity: 0.5 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        />
        <motion.path
          d="M15 24.5 L21 30.5 L33 17.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-emerald-500"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.28, delay: 0.18, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  )
}

function RemainingCallsWidget({ remaining }: { remaining: number }) {
  return (
    <div className="relative flex h-[84px] w-[84px] shrink-0 items-center justify-center">
      <motion.span
        className="pointer-events-none absolute inset-0 rounded-[20px] border-2 border-[#3390EC]/35"
        animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0, 0.45] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
      />
      <div
        className={cn(
          'glass-inset relative flex h-full w-full flex-col items-center justify-center',
          'rounded-[20px] border border-white/50 dark:border-white/10',
        )}
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={remaining}
            initial={{ y: 8, scale: 0.72, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -6, scale: 0.85, opacity: 0 }}
            transition={{ ...quickSpring, duration: 0.32 }}
            className={cn('text-[30px] font-black tabular-nums leading-none', TG)}
          >
            {toFa(remaining)}
          </motion.span>
        </AnimatePresence>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.2 }}
          className="mt-1 text-[10px] font-semibold text-text-soft"
        >
          تماس مانده
        </motion.span>
      </div>
    </div>
  )
}

export function HomeScreen() {
  const navigate = useNavigate()
  const leads = useStore((s) => s.leads)
  const followups = useStore((s) => s.followups)
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const currentAgentId = useStore((s) => s.currentAgentId)
  const openCallMethodSheet = useStore((s) => s.openCallMethodSheet)
  const syncDailyAgentStats = useStore((s) => s.syncDailyAgentStats)

  const [celebrationVisible, setCelebrationVisible] = useState(false)
  const [skippedLeadIds, setSkippedLeadIds] = useState<string[]>([])
  const wasCompleteRef = useRef(false)

  const suggestion = useMemo(() => {
    const visible = filterLeadsForAgent(leads, currentAgentId)
    const filtered = skippedLeadIds.length
      ? visible.filter((lead) => !skippedLeadIds.includes(lead.id))
      : visible
    return rankSuggestions(filtered, followups)[0] ?? null
  }, [leads, followups, skippedLeadIds, currentAgentId])

  const remaining = agent ? Math.max(0, agent.callGoal - agent.callsToday) : 0
  const goalPct = agent?.callGoal ? Math.round((agent.callsToday / agent.callGoal) * 100) : 0
  const goalComplete = remaining === 0 && (agent?.callGoal ?? 0) > 0

  useEffect(() => {
    syncDailyAgentStats()
  }, [syncDailyAgentStats])

  useEffect(() => {
    setSkippedLeadIds((prev) => prev.filter((id) => leads.some((lead) => lead.id === id)))
  }, [leads])
  const nextLead = suggestion?.lead ?? null
  const hasAlternateLead = useMemo(() => {
    if (!nextLead) return false
    return rankSuggestions(
      filterLeadsForAgent(leads, currentAgentId).filter((lead) => lead.id !== nextLead.id),
      followups,
    ).length > 0
  }, [leads, followups, nextLead, currentAgentId])

  useEffect(() => {
    if (goalComplete && !wasCompleteRef.current) {
      setCelebrationVisible(true)
    }
    if (!goalComplete) {
      wasCompleteRef.current = false
      setCelebrationVisible(false)
    }
    wasCompleteRef.current = goalComplete
  }, [goalComplete])

  useEffect(() => {
    if (!celebrationVisible) return

    const dismiss = () => setCelebrationVisible(false)
    const timer = window.setTimeout(() => {
      window.addEventListener('pointerdown', dismiss, { once: true, capture: true })
    }, 400)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointerdown', dismiss, { capture: true })
    }
  }, [celebrationVisible])

  return (
    <Page>
      <AppHeader />

      <div className="space-y-5 px-4 pt-2">
        <DataGate mode="placeholder">
        <div className={cn('relative overflow-visible', celebrationVisible && 'pb-4')}>
          <AnimatePresence>
            {celebrationVisible && (
              <motion.div
                key="goal-celebration"
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
              >
                <GoalCelebration />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            layout
            className={cn(
              'glass-hero relative z-[1] overflow-hidden rounded-[24px] p-5 transition-[box-shadow,background] duration-500',
              goalComplete && 'glass-hero-success',
            )}
          >
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              animate={{
                opacity: goalComplete ? 1 : 0.85,
                scale: goalComplete ? 1.05 : 1,
              }}
              transition={{ duration: 0.45 }}
              className={cn(
                'absolute -left-12 -top-14 h-44 w-44 rounded-full blur-3xl',
                goalComplete ? 'bg-emerald-400/30' : 'bg-[#3390EC]/25',
              )}
            />
            <motion.div
              animate={{ opacity: goalComplete ? 1 : 0.85 }}
              transition={{ duration: 0.45 }}
              className={cn(
                'absolute -bottom-16 -right-10 h-40 w-40 rounded-full blur-3xl',
                goalComplete ? 'bg-emerald-300/20' : 'bg-[#8774E1]/20',
              )}
            />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/15" />
          </div>

          <div className="relative flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <motion.span
                layout
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur-sm',
                  goalComplete
                    ? 'border-emerald-500/25 bg-emerald-500/12 dark:border-emerald-400/30 dark:bg-emerald-400/14'
                    : 'border-[#3390EC]/20 bg-[#3390EC]/10 dark:border-[#8774E1]/25 dark:bg-[#8774E1]/12',
                  goalComplete ? OK : TG,
                )}
              >
                <Sparkles size={13} strokeWidth={2.25} />
                {goalComplete ? 'هدف تکمیل شد' : 'آماده فروش'}
              </motion.span>

              <h2 className="mt-3 text-[21px] font-bold leading-[1.3] text-text">
                {goalComplete ? (
                  <>
                    آفرین!{' '}
                    <span className={cn('font-extrabold', OK)}>کار تمومه</span>
                  </>
                ) : (
                  <>
                    تماس بعدی{' '}
                    <span className={cn('font-extrabold', TG)}>آماده‌ست</span>
                  </>
                )}
              </h2>

              <div className="mt-4 max-w-[220px]">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold">
                  <span className="text-text-muted">پیشرفت هدف امروز</span>
                  <span className="shrink-0 tabular-nums text-text">
                    {toFa(agent?.callsToday ?? 0)}
                    <span className="text-text-soft"> / </span>
                    {toFa(agent?.callGoal ?? 0)}
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
                    initial={false}
                    animate={{ width: `${goalPct}%` }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {goalComplete ? (
                <motion.div
                  key="done"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ ...popSpring, duration: 0.35 }}
                  className={cn(
                    'glass-inset glass-inset-success flex h-[84px] w-[84px] shrink-0 items-center justify-center',
                    'rounded-[20px] border border-emerald-500/30 dark:border-emerald-400/25',
                  )}
                >
                  <AnimatedGoalCheck />
                </motion.div>
              ) : (
                <motion.div
                  key="remaining"
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.88, opacity: 0 }}
                  transition={{ duration: 0.28 }}
                >
                  <RemainingCallsWidget remaining={remaining} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        </div>

        {nextLead ? (
          <NextCallCard
            lead={nextLead}
            reason={suggestion?.reason}
            canSkip={hasAlternateLead}
            onSkip={() => setSkippedLeadIds((prev) => [...prev, nextLead.id])}
            onCall={() => {
              haptic('medium')
              openCallMethodSheet(nextLead)
            }}
            onDetails={() => navigate(`/leads/${nextLead.id}`)}
          />
        ) : (
          <EmptyState
            title="مشتری برای تماس نمانده"
            description="همه مشتریان امروزت را تماس گرفتی. کارت عالی بود."
            action={{ label: 'دیدن همه مشتریان', onClick: () => navigate('/leads') }}
          />
        )}
        </DataGate>
      </div>
    </Page>
  )
}
