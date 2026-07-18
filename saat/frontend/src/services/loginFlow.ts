import type { AuthenticatedUser } from '@/services/auth'
import { apiMode } from '@/services'
import { syncAppData } from '@/services/sync'
import { useStore } from '@/store/useStore'

/** Apply auth session and pull remote data before entering the app shell. */
export async function completeLoginSession(user: AuthenticatedUser): Promise<void> {
  const state = useStore.getState()
  state.setSessionFromAuth(user)

  if (apiMode !== 'http') return

  const payload = await syncAppData({ priorDailyStatsDate: useStore.getState().dailyStatsDate })
  useStore.getState().applySyncData(payload)
}
