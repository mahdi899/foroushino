import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X } from 'lucide-react'
import { useInstallPrompt } from '@/lib/pwa'
import { Button } from '@/components/ui/Button'

const DISMISS_KEY = 'saat-pwa-install-dismissed'

export function InstallPrompt() {
  const { canInstall, install, isInstalled } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (canInstall && !dismissed && !isInstalled) {
      const timer = window.setTimeout(() => setVisible(true), 1200)
      return () => window.clearTimeout(timer)
    }
    setVisible(false)
  }, [canInstall, dismissed, isInstalled])

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
    setVisible(false)
  }

  const onInstall = async () => {
    const ok = await install()
    if (ok) setVisible(false)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="absolute inset-x-3 bottom-[calc(76px+var(--safe-bottom))] z-[70]"
      >
        <div className="rounded-[20px] border border-border bg-surface p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <Download size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-text">نصب سات روی گوشی</p>
              <p className="mt-1 text-[12px] leading-5 text-text-muted">
                طراحی کامل برنامه روی گوشی ذخیره می‌شود و سریع‌تر اجرا می‌شود.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={onInstall}>
                  نصب اپ
                </Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>
                  بعداً
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full p-1 text-text-soft hover:bg-surface-soft"
              aria-label="بستن"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
