import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { useOnline } from '@/lib/network'
import { API_BASE_URL, ApiError } from '@/services/http'
import { apiMode } from '@/services'
import { completeLoginSession } from '@/services/loginFlow'
import { syncAppData } from '@/services/sync'
import { clearToken, fetchMe, isAuthenticated } from '@/services/auth'
import { flushOfflineQueue } from '@/services/offlineQueue'
import { useStore } from '@/store/useStore'

function syncErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'نشست منقضی شده. دوباره وارد شو.'
    return error.message
  }
  if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
    return 'آدرس API روی localhost است — از گوشی به کامپیوتر وصل نمی‌شود. IP لوکال (مثلاً 192.168.x.x) بگذار.'
  }
  return 'اتصال به سرور برقرار نشد. بک‌اند را با --host=0.0.0.0 اجرا کن.'
}

/** Keeps remote data fresh when online; clears readiness when offline. */
export function SyncProvider({ children }: { children: ReactNode }) {
  const online = useOnline()
  const isAuthed = useStore((s) => s.isAuthed)
  const applySyncData = useStore((s) => s.applySyncData)
  const logout = useStore((s) => s.logout)
  const setDataReady = useStore((s) => s.setDataReady)
  const setDataSyncing = useStore((s) => s.setDataSyncing)
  const pushToast = useStore((s) => s.pushToast)
  const lastErrorRef = useRef<string | null>(null)
  const lastSyncAtRef = useRef(0)
  const MIN_BACKGROUND_SYNC_MS = 45_000

  useEffect(() => {
    if (apiMode !== 'http' || !isAuthed) return

    if (!online) {
      setDataReady(false)
      return
    }

    let cancelled = false

    const run = async () => {
      setDataSyncing(true)
      try {
        const payload = await syncAppData({ priorDailyStatsDate: useStore.getState().dailyStatsDate })
        if (!cancelled) {
          applySyncData(payload)
          lastErrorRef.current = null
          lastSyncAtRef.current = Date.now()
          void flushOfflineQueue()
        }
      } catch (error) {
        if (cancelled) return

        if (error instanceof ApiError && error.status === 401) {
          return
        }

        setDataReady(false)
        const message = syncErrorMessage(error)
        if (lastErrorRef.current !== message) {
          lastErrorRef.current = message
          pushToast(`همگام‌سازی داده‌ها ناموفق بود. ${message}`, 'error')
        }
      } finally {
        if (!cancelled) setDataSyncing(false)
      }
    }

    void run()

    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !online) return
      const elapsed = Date.now() - lastSyncAtRef.current
      if (lastSyncAtRef.current > 0 && elapsed < MIN_BACKGROUND_SYNC_MS) return
      void run()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [
    online,
    isAuthed,
    applySyncData,
    logout,
    setDataReady,
    setDataSyncing,
    pushToast,
  ])

  // Restore session from saved token after PWA cold start.
  useEffect(() => {
    if (apiMode !== 'http' || isAuthed || !isAuthenticated()) return

    let cancelled = false

    const restore = async () => {
      try {
        const user = await fetchMe()
        if (!cancelled) await completeLoginSession(user)
      } catch {
        if (!cancelled) clearToken()
      }
    }

    void restore()

    return () => {
      cancelled = true
    }
  }, [isAuthed])

  return <>{children}</>
}

export function useRemoteDataReady() {
  const online = useOnline()
  const dataReady = useStore((s) => s.dataReady)
  const dataSyncing = useStore((s) => s.dataSyncing)
  const isAuthed = useStore((s) => s.isAuthed)
  const hasCachedData = useStore(
    (s) => s.leads.length > 0 || s.agents.length > 1 || s.products.length > 0,
  )

  if (apiMode === 'mock') {
    return { showData: true, syncing: false, needsNetwork: false }
  }

  if (!isAuthed) {
    return { showData: true, syncing: false, needsNetwork: false }
  }

  return {
    showData: online && (dataReady || hasCachedData),
    syncing: online && dataSyncing && !dataReady,
    needsNetwork: true,
  }
}

export { API_BASE_URL }
