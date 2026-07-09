import { useEffect, useState } from 'react'

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function useStandalonePwa() {
  const [standalone, setStandalone] = useState(isStandalonePwa)

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    const onChange = () => setStandalone(isStandalonePwa())
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return standalone
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
  })
}

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false)
  const standalone = useStandalonePwa()

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      deferredPrompt = event as BeforeInstallPromptEvent
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    deferredPrompt = null
    setCanInstall(false)
    return choice.outcome === 'accepted'
  }

  return {
    canInstall: canInstall && !standalone,
    install,
    isInstalled: standalone,
  }
}
