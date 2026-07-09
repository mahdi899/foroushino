import { useEffect, useState, useSyncExternalStore } from 'react'

type NetworkListener = () => void

const listeners = new Set<NetworkListener>()
let online = typeof navigator !== 'undefined' ? navigator.onLine : true

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: NetworkListener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return online
}

function setOnline(next: boolean) {
  if (online === next) return
  online = next
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => setOnline(true))
  window.addEventListener('offline', () => setOnline(false))
}

/** Reactive online/offline flag shared across the app. */
export function useOnline() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}

/** Optional reachability probe — useful when `navigator.onLine` is optimistic. */
export async function probeNetwork(baseUrl: string): Promise<boolean> {
  if (!navigator.onLine) return false

  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 4000)
    const response = await fetch(`${baseUrl.replace(/\/api\/v1$/, '')}/api/v1/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
    window.clearTimeout(timer)
    return response.ok
  } catch {
    return false
  }
}

export function useReachable(probeUrl: string | null, enabled = true) {
  const browserOnline = useOnline()
  const [reachable, setReachable] = useState(browserOnline)

  useEffect(() => {
    if (!enabled || !probeUrl) {
      setReachable(browserOnline)
      return
    }

    if (!browserOnline) {
      setReachable(false)
      return
    }

    let cancelled = false
    probeNetwork(probeUrl).then((ok) => {
      if (!cancelled) setReachable(ok)
    })

    return () => {
      cancelled = true
    }
  }, [browserOnline, enabled, probeUrl])

  return reachable
}
