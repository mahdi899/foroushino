import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { useOnline } from '@/lib/network'
import { API_BASE_URL, ApiError } from '@/services/http'
import { getSuggestion } from '@/lib/leadUtils'
import { api, apiMode } from '@/services'
import { syncAppData } from '@/services/sync'
import { clearToken, fetchMe, isAuthenticated } from '@/services/auth'
import { isAgentRole } from '@/lib/roles'
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
  const upsertLead = useStore((s) => s.upsertLead)
  const role = useStore((s) => s.role)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const setSessionFromAuth = useStore((s) => s.setSessionFromAuth)
  const logout = useStore((s) => s.logout)
  const setDataReady = useStore((s) => s.setDataReady)
  const setDataSyncing = useStore((s) => s.setDataSyncing)
  const pushToast = useStore((s) => s.pushToast)
  const lastErrorRef = useRef<string | null>(null)

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
        const payload = await syncAppData()
        if (!cancelled) {
          applySyncData(payload)
          lastErrorRef.current = null
          void flushOfflineQueue()

          if (isAgentRole(role)) {
            const state = useStore.getState()
            const suggestion = getSuggestion(state.leads, state.followups, currentAgentId)
            if (!suggestion) {
              try {
                // #region agent log
                const _nextT0 = performance.now()
                // #endregion
                const pulled = await api.getNextLead()
                // #region agent log
                fetch('http://127.0.0.1:7541/ingest/5e855e8d-e09f-4418-97d8-e130db1d617f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'90b576'},body:JSON.stringify({sessionId:'90b576',location:'SyncProvider.tsx:getNextLead',message:'post-sync next lead',data:{ms:Math.round(performance.now()-_nextT0),gotLead:!!pulled?.lead},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                if (pulled?.lead) {
                  upsertLead(pulled.lead)
                }
              } catch {
                // Pull-from-pool is best-effort; home still shows suggested_lead from sync.
              }
            }
          }
        }
      } catch (error) {
        if (cancelled) return

        if (error instanceof ApiError && error.status === 401) {
          clearToken()
          logout()
          pushToast('نشست منقضی شده. دوباره وارد شو.', 'error')
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

    return () => {
      cancelled = true
    }
  }, [
    online,
    isAuthed,
    applySyncData,
    upsertLead,
    role,
    currentAgentId,
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
        if (!cancelled) setSessionFromAuth(user)
      } catch {
        if (!cancelled) clearToken()
      }
    }

    void restore()

    return () => {
      cancelled = true
    }
  }, [isAuthed, setSessionFromAuth])

  return <>{children}</>
}

export function useRemoteDataReady() {
  const online = useOnline()
  const dataReady = useStore((s) => s.dataReady)
  const dataSyncing = useStore((s) => s.dataSyncing)
  const isAuthed = useStore((s) => s.isAuthed)

  if (apiMode === 'mock') {
    return { showData: true, syncing: false, needsNetwork: false }
  }

  if (!isAuthed) {
    return { showData: true, syncing: false, needsNetwork: false }
  }

  return {
    showData: online && dataReady,
    syncing: online && dataSyncing && !dataReady,
    needsNetwork: true,
  }
}

export { API_BASE_URL }
