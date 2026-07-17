import type { Availability, AvailabilityAutoReason } from '@/types'
import { useStore } from '@/store/useStore'
import { canAutoSetAvailability } from '@/lib/shiftPresence'
import { isShiftOpen, mergeSyncedWorkSession } from '@/lib/shiftUtils'
import { mapWorkDaySummary, mapWorkSession } from './mappers'
import { apiMode } from './index'
import { http } from './http'

type Dto = Record<string, unknown>

const SHIFT_REFRESH_HISTORY_DAYS = 14

export async function refreshShiftFromServer(
  historyDays: number = SHIFT_REFRESH_HISTORY_DAYS,
): Promise<void> {
  const [current, history] = await Promise.all([
    http.get<Dto>('/shift/current'),
    http.get<Dto[]>(`/shift/history?days=${historyDays}`),
  ])

  const sessionDto = current.session as Dto | null | undefined
  const mappedSession = mapWorkSession(sessionDto)
  const local = useStore.getState()

  useStore.getState().applyShiftState({
    workSession: mergeSyncedWorkSession(local.workSession, mappedSession),
    availability: (current.availability as Availability) ?? local.availability,
    availabilityChangedAt:
      (current.availability_changed_at as string) ?? local.availabilityChangedAt,
    availabilityAutoReason: null,
    workDaySummaries: Array.isArray(history) ? history.map(mapWorkDaySummary) : [],
  })
}

export async function performAutoAvailability(
  status: Availability,
  autoReason: AvailabilityAutoReason | null,
): Promise<void> {
  const state = useStore.getState()
  if (!canAutoSetAvailability(
    state.availability,
    state.workSession,
    state.activeCallLeadId,
    status,
  )) {
    return
  }

  if (state.availability === status && state.availabilityAutoReason === autoReason) {
    return
  }

  useStore.getState().setAvailability(status, { source: 'auto', autoReason })

  if (apiMode === 'http') {
    try {
      await http.post('/shift/availability', { availability: status })
    } catch {
      // Keep local state; sync will reconcile on next successful pull.
    }
  }
}

export async function performStartShift(availability: Availability): Promise<void> {
  useStore.getState().startShift(availability)

  if (apiMode !== 'http') return

  try {
    const data = await http.post<Dto>('/shift/start', { availability })
    const mappedSession = mapWorkSession(data.session as Dto | null | undefined)
    const state = useStore.getState()

    useStore.getState().applyShiftState({
      workSession: mergeSyncedWorkSession(state.workSession, mappedSession),
      availability: (data.user as Dto | undefined)?.availability as Availability ?? availability,
      availabilityChangedAt: state.availabilityChangedAt,
      availabilityAutoReason: null,
      workDaySummaries: state.workDaySummaries,
    })

    if (!isShiftOpen(useStore.getState().workSession)) {
      await refreshShiftFromServer()
    }
  } catch (error) {
    // Optimistic local shift stays open for offline / flaky networks.
    throw error
  }
}

export function performEndShift(): void {
  useStore.getState().endShift()

  if (apiMode !== 'http') return

  void (async () => {
    try {
      await http.post('/shift/end')
      await refreshShiftFromServer()
    } catch {
      // Local state already closed; server sync is best-effort.
    }
  })()
}

export async function performSetAvailability(status: Availability): Promise<void> {
  useStore.getState().setAvailability(status, { source: 'manual' })

  if (apiMode === 'http') {
    try {
      await http.post('/shift/availability', { availability: status })
      await refreshShiftFromServer()
    } catch {
      // Keep local state; sync will reconcile on next successful pull.
    }
  }
}
