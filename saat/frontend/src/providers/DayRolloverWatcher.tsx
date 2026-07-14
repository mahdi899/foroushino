import { useEffect, useRef } from 'react'
import { todayDateKey } from '@/lib/shiftUtils'
import { useStore } from '@/store/useStore'

const CHECK_INTERVAL_MS = 60_000

/** Recomputes daily call stats when the local calendar day changes (e.g. after midnight). */
export function DayRolloverWatcher() {
  const isAuthed = useStore((s) => s.isAuthed)
  const dateRef = useRef(todayDateKey())

  useEffect(() => {
    if (!isAuthed) return

    const onRollover = () => {
      const state = useStore.getState()
      if (state.dailyStatsDate === dateRef.current) return
      state.syncDailyAgentStats()
    }

    const tick = () => {
      const today = todayDateKey()
      if (today === dateRef.current) return
      dateRef.current = today
      onRollover()
    }

    tick()
    const intervalId = window.setInterval(tick, CHECK_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isAuthed])

  return null
}
