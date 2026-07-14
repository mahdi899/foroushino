const STORAGE_KEY = 'saat-call-session-v1'

export type CallSession = {
  leadId: string
  callId?: number
  durationSec?: number
  endedAt?: string
}

export function readCallSession(): CallSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CallSession) : null
  } catch {
    return null
  }
}

export function saveCallSession(session: CallSession): void {
  const prev = readCallSession()
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...session }))
}

export function clearCallSession(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
