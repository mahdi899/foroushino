/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_BUILD_VERSION__: string
declare const __APP_BUILD_HASH__: string
declare const __APP_BUILD_TIME__: string

interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'http'
  readonly VITE_API_BASE_URL?: string
  readonly VITE_TELEGRAM_BOT_USERNAME?: string
  readonly VITE_VOIP_CALL_ENABLED?: string
  readonly VITE_UPDATE_TYPE?: 'forced' | 'optional' | 'silent'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  colorScheme?: 'light' | 'dark'
  viewportStableHeight?: number
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  /** Raw signed query string sent as-is to the backend for verification. */
  initData?: string
  initDataUnsafe?: {
    user?: {
      id: number
      first_name?: string
      last_name?: string
      username?: string
    }
  }
}

interface Window {
  TelegramWebviewProxy?: unknown
  Telegram?: {
    WebApp?: TelegramWebApp
  }
}
