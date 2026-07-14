import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { AWAY_CHECK_INTERVAL_MS, isFollowUpWorkRoute } from '@/lib/shiftRoutes'
import {
  shouldApplyFollowUpRouteStatus,
  shouldMarkAwayFromApp,
  shouldRestoreOnReturn,
} from '@/lib/shiftPresence'
import { isShiftOpen } from '@/lib/shiftUtils'
import { performAutoAvailability } from '@/services/shiftActions'

/** Keeps availability in sync with follow-up routes and app foreground state. */
export function ShiftPresenceWatcher() {
  const location = useLocation()
  const isAuthed = useStore((s) => s.isAuthed)
  const role = useStore((s) => s.role)

  useEffect(() => {
    if (!isAuthed || role !== 'agent') return

    const onFollowUpRoute = isFollowUpWorkRoute(location.pathname)
    const state = useStore.getState()

    if (!isShiftOpen(state.workSession)) return

    if (onFollowUpRoute) {
      if (shouldApplyFollowUpRouteStatus(state.availability, state.activeCallLeadId)) {
        void performAutoAvailability('doing_follow_up', 'follow_up_route')
      }
      return
    }

    if (
      state.availability === 'doing_follow_up' &&
      state.availabilityAutoReason === 'follow_up_route'
    ) {
      void performAutoAvailability('available', null)
    }
  }, [isAuthed, role, location.pathname])

  useEffect(() => {
    if (!isAuthed || role !== 'agent') return

    const markAwayIfNeeded = () => {
      const state = useStore.getState()
      if (!isShiftOpen(state.workSession)) return
      if (document.visibilityState !== 'hidden') return
      if (!shouldMarkAwayFromApp(state.availability, state.activeCallLeadId)) return
      void performAutoAvailability('doing_follow_up', 'away_from_app')
    }

    const onVisibility = () => {
      const state = useStore.getState()
      if (!isShiftOpen(state.workSession)) return

      if (document.visibilityState === 'visible') {
        const next = shouldRestoreOnReturn(
          state.availability,
          state.availabilityAutoReason,
          state.activeCallLeadId,
        )
        if (next) void performAutoAvailability(next, null)
        return
      }

      markAwayIfNeeded()
    }

    const intervalId = window.setInterval(markAwayIfNeeded, AWAY_CHECK_INTERVAL_MS)

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isAuthed, role])

  return null
}
