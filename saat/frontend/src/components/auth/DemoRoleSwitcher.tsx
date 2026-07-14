import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useDemoMode } from '@/hooks/useDemoMode'
import { useStore } from '@/store/useStore'
import { loginWithDemoAccount, type DemoAccount } from '@/services/auth'
import { syncAppData } from '@/services/sync'
import { ApiError } from '@/services/http'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

interface DemoRolePopupProps {
  open: boolean
  onClose: () => void
}

export function DemoRolePopup({ open, onClose }: DemoRolePopupProps) {
  const navigate = useNavigate()
  const { accounts } = useDemoMode()
  const role = useStore((s) => s.role)
  const setSessionFromAuth = useStore((s) => s.setSessionFromAuth)
  const applySyncData = useStore((s) => s.applySyncData)
  const pushToast = useStore((s) => s.pushToast)
  const [switching, setSwitching] = useState<string | null>(null)

  const handleSwitch = async (account: DemoAccount) => {
    if (account.role === role || switching) return

    haptic('light')
    setSwitching(account.phone)
    try {
      const user = await loginWithDemoAccount(account)
      setSessionFromAuth(user)
      const payload = await syncAppData()
      applySyncData(payload)
      onClose()
      pushToast(`نقش: ${account.label}`, 'success')
      navigate('/home', { replace: true })
    } catch (error) {
      haptic('error')
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'تغییر نقش ناموفق بود'
      pushToast(message, 'error')
    } finally {
      setSwitching(null)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="بستن"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !switching && onClose()}
            className="absolute inset-0 z-50 bg-black/25"
          />
          <motion.div
            role="dialog"
            aria-modal
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'absolute left-1/2 top-1/2 z-[60] w-[min(280px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2',
              'rounded-[16px] border border-white/60 bg-white p-4 shadow-xl',
              'dark:border-white/10 dark:bg-[#242F3D]',
            )}
          >
            <p className="text-center text-[14px] font-bold text-text">تغییر نقش دمو</p>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {accounts.map((account) => {
                const active = account.role === role
                const busy = switching === account.phone

                return (
                  <button
                    key={account.phone}
                    type="button"
                    disabled={!!switching}
                    onClick={() => void handleSwitch(account)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors',
                      active
                        ? 'bg-[#3390EC] text-white dark:bg-[#8774E1]'
                        : 'bg-black/[0.06] text-text-muted active:bg-black/[0.1] dark:bg-white/10 dark:text-text-soft',
                      busy && 'opacity-60',
                    )}
                  >
                    {busy ? '…' : account.label}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              disabled={!!switching}
              onClick={onClose}
              className="mt-4 w-full py-1 text-center text-[12px] font-semibold text-text-soft"
            >
              بستن
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
