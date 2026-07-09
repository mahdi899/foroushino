// Thin wrapper around the Telegram WebApp SDK.
// Works as a no-op in a plain mobile browser, and connects to the real
// Telegram WebApp when running inside Telegram.

function getWebApp() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined
}

export function initTelegram() {
  const wa = getWebApp()
  if (!wa) return
  try {
    wa.ready()
    wa.expand()
    wa.setHeaderColor?.('#ffffff')
    wa.setBackgroundColor?.('#F8FBFB')
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
