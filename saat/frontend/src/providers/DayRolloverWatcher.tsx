import { useEffect, useRef } from 'react'
import { msUntilNextBusinessMidnight, todayDateKey } from '@/lib/businessDate'
import { getManagedTeam } from '@/lib/teamUtils'
import { isManagementRole } from '@/lib/roles'
import { apiMode } from '@/services'
import { trySyncAppData } from '@/services/sync'
import { fetchTeamLive } from '@/services/teamLive'
import { useStore } from '@/store/useStore'

const FALLBACK_CHECK_MS = 60_000

/** Rolls daily stats and closes prior work-day records at Iran midnight. */
export function DayRolloverWatcher() {
  const isAuthed = useStore((s) => s.isAuthed)
  const dateRef = useRef(todayDateKey())
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isAuthed) return

    const runRollover = () => {
      const today = todayDateKey()
      if (today === dateRef.current) return
      dateRef.current = today

      const state = useStore.getState()
      state.onBusinessDayRollover()

      if (apiMode !== 'http') return

      void (async () => {
        try {
          if (isManagementRole(state.role)) {
            const team = getManagedTeam(state.teams, state.currentAgentId, state.role)
            const live = await fetchTeamLive(team?.id ?? null)
            useStore.getState().mergeTeamLiveStats(live)
          }
        } catch {
          // Keep local rollover state.
        }

        const payload = await trySyncAppData()
        if (payload) useStore.getState().applySyncData(payload)
      })()
    }

    const scheduleNextMidnight = () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        runRollover()
        scheduleNextMidnight()
      }, msUntilNextBusinessMidnight())
    }

    const today = todayDateKey()
    dateRef.current = today
    const state = useStore.getState()
    if (state.dailyStatsDate !== today) {
      state.onBusinessDayRollover()
    }

    scheduleNextMidnight()
    const intervalId = window.setInterval(runRollover, FALLBACK_CHECK_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') runRollover()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isAuthed])

  return null
}
