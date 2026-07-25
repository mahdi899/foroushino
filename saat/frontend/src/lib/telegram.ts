// Thin wrapper around the Telegram WebApp SDK.
// Works as a no-op in a plain mobile browser, and connects to the real
// Telegram WebApp when running inside Telegram.

function getWebApp() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined
}

function applyTelegramViewportHeight() {
  const wa = getWebApp() as
    | (NonNullable<ReturnType<typeof getWebApp>> & {
        viewportHeight?: number
        onEvent?: (event: string, cb: () => void) => void
      })
    | undefined
  const root = document.documentElement
  const height = wa?.viewportStableHeight || wa?.viewportHeight || window.innerHeight
  if (height > 0) {
    root.style.setProperty('--tg-vh', `${height}px`)
    root.style.setProperty('--app-vh', `${height}px`)
  }
}

export function initTelegram() {
  const wa = getWebApp() as
    | (NonNullable<ReturnType<typeof getWebApp>> & {
        onEvent?: (event: string, cb: () => void) => void
      })
    | undefined
  if (!wa) {
    applyTelegramViewportHeight()
    return
  }
  try {
    wa.ready()
    wa.expand()
    wa.setHeaderColor?.('#ffffff')
    wa.setBackgroundColor?.('#F8FBFB')
    applyTelegramViewportHeight()
    wa.onEvent?.('viewportChanged', applyTelegramViewportHeight)
  } catch {
    // ignore – running outside Telegram
  }
}

export function haptic(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection',
) {
  const hf = getWebApp()?.HapticFeedback
  if (!hf) return
  try {
    if (type === 'success' || type === 'warning' || type === 'error') {
      hf.notificationOccurred(type)
    } else if (type === 'selection') {
      hf.selectionChanged()
    } else {
      hf.impactOccurred(type)
    }
  } catch {
    // ignore
  }
}

export function isInTelegram(): boolean {
  return !!getTelegramInitData()
}

/** True when the Telegram WebApp SDK is present (may still lack signed initData outside Telegram). */
export function hasTelegramWebApp(): boolean {
  return !!getWebApp()
}

/** Raw signed `initData` string to hand to the backend for verification, if running inside Telegram. */
export function getTelegramInitData(): string | null {
  const raw = getWebApp()?.initData
  return raw && raw.length > 0 ? raw : null
}
