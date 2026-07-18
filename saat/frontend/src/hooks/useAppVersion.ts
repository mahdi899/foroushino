import { useState, useEffect, useCallback, useRef } from 'react'

declare const __APP_BUILD_VERSION__: string
declare const __APP_BUILD_HASH__: string

export type UpdateType = 'forced' | 'optional' | 'silent'

interface ServerVersion {
  version: string
  buildHash: string
  buildTime: string
  timestamp: number
  updateType: UpdateType
  minVersion: string
}

export interface AppVersionState {
  currentVersion: string
  currentHash: string
  latestVersion: string | null
  latestHash: string | null
  updateType: UpdateType | null
  hasUpdate: boolean
  isChecking: boolean
  lastChecked: number | null
}

const CHECK_INTERVAL = 15 * 60_000
const INITIAL_DELAY = 10_000
const DISMISSED_KEY = 'saat_update_dismissed'
const UPDATE_ATTEMPTED_KEY = 'saat_update_attempted'
const AUTH_KEYS = [
  'saat-store',
  'auth-storage',
  'auth_token',
  'auth_data',
  DISMISSED_KEY,
  UPDATE_ATTEMPTED_KEY,
]

const TELEGRAM_UPDATE_COOLDOWN = 60 * 60_000
const WEB_UPDATE_COOLDOWN = 10 * 60_000
const DISMISS_COOLDOWN = 60 * 60_000

const isTelegram = () =>
  typeof window !== 'undefined' && !!(window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData

function parseSemver(v: string): [number, number, number] {
  const parts = v.replace(/[^0-9.]/g, '').split('.').map(Number)
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
}

function isNewerVersion(server: string, client: string): boolean {
  const [sMaj, sMin, sPat] = parseSemver(server)
  const [cMaj, cMin, cPat] = parseSemver(client)
  if (sMaj !== cMaj) return sMaj > cMaj
  if (sMin !== cMin) return sMin > cMin
  return sPat > cPat
}

function isBelowMinVersion(client: string, min: string): boolean {
  return isNewerVersion(min, client)
}

function getClientVersion(): string {
  try {
    return typeof __APP_BUILD_VERSION__ !== 'undefined' ? __APP_BUILD_VERSION__ : 'dev'
  } catch {
    return 'dev'
  }
}

function getClientHash(): string {
  try {
    return typeof __APP_BUILD_HASH__ !== 'undefined' ? __APP_BUILD_HASH__ : 'dev'
  } catch {
    return 'dev'
  }
}

function getAttemptedUpdate(): { hash: string; at: number } | null {
  try {
    const raw = localStorage.getItem(UPDATE_ATTEMPTED_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setAttemptedUpdate(hash: string): void {
  try {
    localStorage.setItem(UPDATE_ATTEMPTED_KEY, JSON.stringify({ hash, at: Date.now() }))
  } catch {
    /* quota */
  }
}

function getDismissedUpdate(): { hash: string; at: number } | null {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setDismissedUpdate(hash: string): void {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify({ hash, at: Date.now() }))
  } catch {
    /* quota */
  }
}

/**
 * Smart app-version hook (same strategy as Iranian dating app).
 *
 * Web: polls /version.json → UpdateBanner (forced | optional | silent)
 * Telegram: skipped here — index.html `_tg` cache-bust owns Mini App updates
 */
export function useAppVersion() {
  const [state, setState] = useState<AppVersionState>({
    currentVersion: getClientVersion(),
    currentHash: getClientHash(),
    latestVersion: null,
    latestHash: null,
    updateType: null,
    hasUpdate: false,
    isChecking: false,
    lastChecked: null,
  })

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('_update') || params.has('_tg')) {
      const clean = window.location.pathname
      window.history.replaceState(null, '', clean)
    }
  }, [])

  const checkForUpdate = useCallback(async () => {
    if (import.meta.env.DEV) return

    const clientVersion = getClientVersion()
    if (clientVersion === 'dev') return

    // Telegram: HTML-level `_tg` redirect handles updates (avoids popup loops)
    if (isTelegram()) return

    try {
      setState((prev) => ({ ...prev, isChecking: true }))

      const cacheBust = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const res = await fetch(`/version.json?_t=${cacheBust}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const server: ServerVersion = await res.json()
      const clientHash = getClientHash()

      if (server.buildHash === clientHash) {
        localStorage.removeItem(UPDATE_ATTEMPTED_KEY)
        localStorage.removeItem(DISMISSED_KEY)
        setState((prev) => ({
          ...prev,
          isChecking: false,
          lastChecked: Date.now(),
          hasUpdate: false,
        }))
        return
      }

      const attempted = getAttemptedUpdate()
      const cooldown = isTelegram() ? TELEGRAM_UPDATE_COOLDOWN : WEB_UPDATE_COOLDOWN
      if (attempted && attempted.hash === server.buildHash && Date.now() - attempted.at < cooldown) {
        setState((prev) => ({
          ...prev,
          isChecking: false,
          lastChecked: Date.now(),
          hasUpdate: false,
        }))
        return
      }

      const dismissed = getDismissedUpdate()
      if (dismissed && dismissed.hash === server.buildHash && Date.now() - dismissed.at < DISMISS_COOLDOWN) {
        setState((prev) => ({
          ...prev,
          isChecking: false,
          lastChecked: Date.now(),
          hasUpdate: false,
        }))
        return
      }

      let effectiveType: UpdateType = server.updateType || 'optional'
      if (isBelowMinVersion(clientVersion, server.minVersion)) {
        effectiveType = 'forced'
      }

      if (effectiveType === 'silent') {
        notifyServiceWorker('SKIP_WAITING')
        setState((prev) => ({
          ...prev,
          isChecking: false,
          lastChecked: Date.now(),
          latestVersion: server.version,
          latestHash: server.buildHash,
          updateType: 'silent',
          hasUpdate: false,
        }))
        return
      }

      setState((prev) => ({
        ...prev,
        latestVersion: server.version,
        latestHash: server.buildHash,
        updateType: effectiveType,
        hasUpdate: true,
        isChecking: false,
        lastChecked: Date.now(),
      }))
    } catch {
      setState((prev) => ({ ...prev, isChecking: false }))
    }
  }, [])

  useEffect(() => {
    const delay = isTelegram() ? 3_000 : INITIAL_DELAY
    const interval = isTelegram() ? 3 * 60_000 : CHECK_INTERVAL

    const initialTimeout = setTimeout(checkForUpdate, delay)
    intervalRef.current = setInterval(checkForUpdate, interval)

    let lastVisCheck = 0
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastVisCheck > 60_000) {
        lastVisCheck = Date.now()
        checkForUpdate()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [checkForUpdate])

  const applyUpdate = useCallback(async () => {
    if (state.latestHash) {
      setAttemptedUpdate(state.latestHash)
    }

    try {
      await nukeCaches()

      const bust = Date.now()
      if (isTelegram()) {
        window.location.href = `${window.location.origin}${window.location.pathname}?_update=${bust}`
        return
      }

      window.location.replace(`${window.location.origin}${window.location.pathname}?_update=${bust}`)
    } catch {
      window.location.reload()
    }
  }, [state.latestHash])

  const dismissUpdate = useCallback(() => {
    if (state.latestHash) {
      setDismissedUpdate(state.latestHash)
    }
    setState((prev) => ({ ...prev, hasUpdate: false }))
  }, [state.latestHash])

  const clearAllCaches = useCallback(async () => {
    try {
      await nukeCaches()
      Object.keys(localStorage).forEach((key) => {
        if (!AUTH_KEYS.includes(key) && !key.startsWith('saat-theme:')) {
          localStorage.removeItem(key)
        }
      })
      sessionStorage.clear()
      return true
    } catch {
      return false
    }
  }, [])

  return {
    ...state,
    checkForUpdate,
    applyUpdate,
    dismissUpdate,
    clearAllCaches,
  }
}

function notifyServiceWorker(type: string) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type })
  }
}

async function nukeCaches(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
  }
  if ('caches' in window) {
    const names = await caches.keys()
    await Promise.all(names.map((n) => caches.delete(n)))
  }
}
