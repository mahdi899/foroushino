import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Target } from 'lucide-react'
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
import { cn } from '@/lib/cn'
import { DataGate } from '@/components/pwa/DataGate'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'
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
            <div className={cn('relative overflow-visible', celebrationVisible && 'pb-4')}>
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

              {/* Progress + work queue */}
              <motion.div
                layout
                className={cn(
                  'glass-card relative z-[1] overflow-hidden rounded-[20px] border border-white/60 p-4 dark:border-white/10',
                  goalComplete && 'border-emerald-500/25',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-[10px]',
                        goalComplete
                          ? 'bg-emerald-500/14 text-emerald-600 dark:text-emerald-400'
                          : 'bg-[#3390EC]/12 dark:bg-[#8774E1]/16',
                      )}
                    >
                      <Target size={16} className={goalComplete ? OK : TG} strokeWidth={2.35} />
                    </span>
                    <div>
                      <p className="text-[12px] font-semibold text-text-muted">هدف تماس امروز</p>
                      <p className="text-[17px] font-black tabular-nums leading-tight text-text">
                        {toFa(agent?.callsToday ?? 0)}
                        <span className="mx-1 text-[14px] font-bold text-text-soft">/</span>
                        {toFa(agent?.callGoal ?? 0)}
                      </p>
                    </div>
                  </div>

                  <div className="text-left">
                    {goalComplete ? (
                      <span className={cn('text-[13px] font-bold', OK)}>تکمیل شد</span>
                    ) : (
                      <>
                        <span className={cn('text-[22px] font-black tabular-nums leading-none', TG)}>
                          {toFa(remaining)}
                        </span>
                        <p className="mt-0.5 text-[10px] font-semibold text-text-soft">تماس مانده</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3 h-[6px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
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

                <div className="mt-4 border-t border-white/40 pt-4 dark:border-white/8">
                  <AgentWorkQueue
                    todayCount={todayCount}
                    overdueCount={overdueCount}
                    callableCount={callableCount}
                    goalComplete={goalComplete}
                  />
                </div>
              </motion.div>
            </div>

            {/* Next call — primary action */}
            {nextLead ? (
              <div>
                <p className="mb-2.5 px-0.5 text-[12px] font-bold text-text-muted">اولویت تماس</p>
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
