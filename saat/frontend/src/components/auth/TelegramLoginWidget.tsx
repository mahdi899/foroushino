import { useEffect, useRef } from 'react'
import { TELEGRAM_BOT_USERNAME, type TelegramWidgetUser } from '@/services/auth'

declare global {
  interface Window {
    __saatTelegramWidgetAuth?: (user: TelegramWidgetUser) => void
  }
}

interface TelegramLoginWidgetProps {
  onAuth: (user: TelegramWidgetUser) => void
  disabled?: boolean
}

export function TelegramLoginWidget({ onAuth, disabled }: TelegramLoginWidgetProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (disabled || !TELEGRAM_BOT_USERNAME || !hostRef.current) return

    const host = hostRef.current
    host.innerHTML = ''

    window.__saatTelegramWidgetAuth = (user) => {
      onAuth(user)
    }

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', TELEGRAM_BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '10')
    script.setAttribute('data-userpic', 'false')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', '__saatTelegramWidgetAuth(user)')
    host.appendChild(script)

    return () => {
      host.innerHTML = ''
      delete window.__saatTelegramWidgetAuth
    }
  }, [disabled, onAuth])

  if (!TELEGRAM_BOT_USERNAME) {
    return null
  }

  return (
    <div
      ref={hostRef}
      className="flex min-h-[50px] w-full items-center justify-center overflow-hidden rounded-[10px]"
    />
  )
}
