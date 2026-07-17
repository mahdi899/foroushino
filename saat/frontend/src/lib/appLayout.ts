import { useEffect, useState } from 'react'
import { isStandalonePwa } from '@/lib/pwa'
import { isInTelegram } from '@/lib/telegram'

export const APP_PHONE_MAX_WIDTH = 480
const MOBILE_BREAKPOINT_PX = 520

export type AppShellMode = 'device' | 'preview'

function detectInstalled(): boolean {
  return isStandalonePwa() || isInTelegram()
}

function detectNarrow(): boolean {
  if (typeof window === 'undefined') return true
  return window.innerWidth <= MOBILE_BREAKPOINT_PX
}

/** `device` = full phone viewport (PWA / Telegram / narrow browser). `preview` = desktop dev frame. */
export function useAppShellLayout() {
  const [installed, setInstalled] = useState(detectInstalled)
  const [narrow, setNarrow] = useState(detectNarrow)

  useEffect(() => {
    const refresh = () => {
      setInstalled(detectInstalled())
      setNarrow(detectNarrow())
    }

    refresh()

    const mqStandalone = window.matchMedia('(display-mode: standalone)')
    const mqFullscreen = window.matchMedia('(display-mode: fullscreen)')
    const mqNarrow = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`)

    mqStandalone.addEventListener('change', refresh)
    mqFullscreen.addEventListener('change', refresh)
    mqNarrow.addEventListener('change', refresh)
    window.addEventListener('resize', refresh)
    window.addEventListener('orientationchange', refresh)

    return () => {
      mqStandalone.removeEventListener('change', refresh)
      mqFullscreen.removeEventListener('change', refresh)
      mqNarrow.removeEventListener('change', refresh)
      window.removeEventListener('resize', refresh)
      window.removeEventListener('orientationchange', refresh)
    }
  }, [])

  const mode: AppShellMode = installed || narrow ? 'device' : 'preview'

  return { mode, installed, narrow }
}
