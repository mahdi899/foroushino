import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GoalTargetIcon } from '@/components/domain/GoalTargetIcon'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { AppHeader } from './AppHeader'
import { AgentWorkQueue } from './AgentWorkQueue'
import { NextCallCard } from '@/components/domain/NextCallCard'
import { GoalCelebration } from '@/components/domain/GoalCelebration'
import { BreakOverlay } from '@/components/domain/BreakOverlay'
import { EmptyState } from '@/components/ui/States'
import { rankSuggestions, isCallable } from '@/services/logic'
import {
  filterFollowupsForAgent,
  filterLeadsForAgent,
  overdueFollowups,
  todayFollowups,
} from '@/lib/leadUtils'
import { isShiftOpen } from '@/lib/shiftUtils'
import { performSetAvailability } from '@/services/shiftActions'
import { toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { BRAND_PROGRESS, BRAND_TEXT } from '@/lib/brand'
import { cn } from '@/lib/cn'
import { DataGate } from '@/components/pwa/DataGate'

const TG = BRAND_TEXT
const OK = 'text-emerald-600 dark:text-emerald-400'

export function HomeScreen() {
  const navigate = useNavigate()
  const leads = useStore((s) => s.leads)
  const followups = useStore((s) => s.followups)
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const currentAgentId = useStore((s) => s.currentAgentId)
  const availability = useStore((s) => s.availability)
  const workSession = useStore((s) => s.workSession)
  const openCallMethodSheet = useStore((s) => s.openCallMethodSheet)
  const syncDailyAgentStats = useStore((s) => s.syncDailyAgentStats)

  const onBreak = availability === 'on_break' && isShiftOpen(workSession)

  const [celebrationVisible, setCelebrationVisible] = useState(false)
  const [skippedLeadIds, setSkippedLeadIds] = useState<string[]>([])
  const wasCompleteRef = useRef(false)

  const visibleLeads = useMemo(
    () => filterLeadsForAgent(leads, currentAgentId),
    [leads, currentAgentId],
  )
  const agentFollowups = useMemo(
    () => filterFollowupsForAgent(followups, leads, currentAgentId),
    [followups, leads, currentAgentId],
  )

  const suggestion = useMemo(() => {
    const filtered = skippedLeadIds.length
      ? visibleLeads.filter((lead) => !skippedLeadIds.includes(lead.id))
      : visibleLeads
    return rankSuggestions(filtered, followups)[0] ?? null
  }, [visibleLeads, followups, skippedLeadIds])

  const remaining = agent ? Math.max(0, agent.callGoal - agent.callsToday) : 0
  const goalPct = agent?.callGoal ? Math.round((agent.callsToday / agent.callGoal) * 100) : 0
  const goalComplete = remaining === 0 && (agent?.callGoal ?? 0) > 0

  const todayCount = useMemo(() => todayFollowups(agentFollowups).length, [agentFollowups])
  const overdueCount = useMemo(() => overdueFollowups(agentFollowups).length, [agentFollowups])
  const callableCount = useMemo(() => visibleLeads.filter(isCallable).length, [visibleLeads])

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
      visibleLeads.filter((lead) => lead.id !== nextLead.id),
      followups,
    ).length > 0
  }, [visibleLeads, followups, nextLead])

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

      <div className="relative min-h-[calc(100dvh-88px)]">
        <div
          className={cn(
            'space-y-4 px-4 pt-2 pb-2 transition-[filter,opacity] duration-500',
            onBreak && 'pointer-events-none select-none blur-[6px] opacity-[0.72] saturate-[0.92]',
          )}
        >
          <DataGate mode="placeholder">
            <div className={cn('relative space-y-3 overflow-visible', celebrationVisible && 'pb-4')}>
              <AnimatePresence>
                {celebrationVisible && (
                  <motion.div
                    key="goal-celebration"
                    className="absolute inset-0 z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.28 }}
                  >
                    <GoalCelebration />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Daily goal — iOS activity style */}
              <motion.div
                layout
                className={cn(
                  'glass-card relative z-[1] overflow-hidden rounded-[22px] border border-white/55 p-4 dark:border-white/10',
                  goalComplete && 'border-emerald-500/20',
                )}
              >
                <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary-500/10 blur-2xl dark:bg-primary-400/12" />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-text-soft">هدف تماس امروز</p>
                    <p className="mt-1 flex items-baseline gap-1.5 tabular-nums">
                      <span className="text-[34px] font-black leading-none tracking-tight text-text">
                        {toFa(agent?.callsToday ?? 0)}
                      </span>
                      <span className="text-[15px] font-bold text-text-soft">
                        / {toFa(agent?.callGoal ?? 0)}
                      </span>
                    </p>
                  </div>

                  <GoalTargetIcon complete={goalComplete} />
                </div>

                <div className="relative mt-4">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
                    <span className={cn(goalComplete ? OK : 'text-text-soft')}>
                      {goalComplete ? 'تکمیل شد' : `${toFa(goalPct)}٪ پیشرفت`}
                    </span>
                    {!goalComplete && (
                      <span className={cn('tabular-nums', TG)}>
                        {toFa(remaining)} تماس مانده
                      </span>
                    )}
                  </div>
                  <div className="h-[5px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                    <motion.div
                      className={cn(
                        'h-full rounded-full',
                        goalComplete
                          ? 'bg-gradient-to-l from-emerald-500 to-emerald-400'
                          : BRAND_PROGRESS,
                      )}
                      initial={false}
                      animate={{ width: `${goalPct}%` }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Work queue — iOS grouped widgets */}
              <motion.div
                layout
                className="glass-card relative z-[1] overflow-hidden rounded-[22px] border border-white/55 dark:border-white/10"
              >
                <div className="border-b border-white/40 px-4 py-2.5 dark:border-white/8">
                  <p className="text-[12px] font-bold text-text-soft">صندوق کار</p>
                </div>
                <div className="px-1 pb-1 pt-0.5">
                  <AgentWorkQueue
                    todayCount={todayCount}
                    overdueCount={overdueCount}
                    callableCount={callableCount}
                    goalComplete={goalComplete}
                  />
                </div>
              </motion.div>
            </div>

            {nextLead ? (
              <div className="mt-1">
                <p className="mb-2 px-0.5 text-[13px] font-bold text-text">اولویت تماس</p>
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
              </div>
            ) : (
              <EmptyState
                title="مشتری برای تماس نمانده"
                description={
                  overdueCount > 0
                    ? `${toFa(overdueCount)} پیگیری عقب‌افتاده داری — از بخش پیگیری‌ها شروع کن.`
                    : 'همه مشتریان امروزت را تماس گرفتی. کارت عالی بود.'
                }
                action={{
                  label: overdueCount > 0 ? 'پیگیری‌های عقب‌افتاده' : 'دیدن همه مشتریان',
                  onClick: () =>
                    navigate(overdueCount > 0 ? '/followups?bucket=overdue' : '/leads'),
                }}
              />
            )}
          </DataGate>
        </div>

        <AnimatePresence>
          {onBreak && (
            <BreakOverlay onResume={() => void performSetAvailability('available')} />
          )}
        </AnimatePresence>
      </div>
    </Page>
  )
}
