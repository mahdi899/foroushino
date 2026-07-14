import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, UsersRound } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useDemoMode } from '@/hooks/useDemoMode'
import { useStore } from '@/store/useStore'
import { loginWithDemoAccount, type DemoAccount } from '@/services/auth'
import { syncAppData } from '@/services/sync'
import { roleLabels } from '@/data/labels'
import { ApiError } from '@/services/http'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'
import type { Role } from '@/types'

interface DemoRoleSwitcherProps {
  className?: string
}

export function DemoRoleSwitcher({ className }: DemoRoleSwitcherProps) {
  const navigate = useNavigate()
  const { enabled, accounts } = useDemoMode()
  const role = useStore((s) => s.role)
  const setSessionFromAuth = useStore((s) => s.setSessionFromAuth)
  const applySyncData = useStore((s) => s.applySyncData)
  const pushToast = useStore((s) => s.pushToast)

  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)

  if (!enabled) return null

  const handleSwitch = async (account: DemoAccount) => {
    if (account.role === role || switching) return

    haptic('light')
    setSwitching(account.phone)
    try {
      const user = await loginWithDemoAccount(account)
      setSessionFromAuth(user)
      const payload = await syncAppData()
      applySyncData(payload)
      setOpen(false)
      pushToast(`نقش فعال: ${account.label}`, 'success')
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
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5',
          'border-amber-300/70 bg-amber-50/95 text-[12px] font-bold text-amber-900',
          'shadow-[0_6px_18px_rgba(245,158,11,0.18)] backdrop-blur-md',
          'dark:border-amber-400/25 dark:bg-amber-500/12 dark:text-amber-100',
          className,
        )}
      >
        <UsersRound size={14} strokeWidth={2.35} />
        <span>{roleLabels[role as Role]}</span>
      </motion.button>

      <BottomSheet open={open} onClose={() => !switching && setOpen(false)} title="تغییر نقش دمو">
        <p className="pb-3 text-[13px] font-medium leading-6 text-text-muted">
          برای تست سریع UI هر نقش، یکی از حساب‌های دمو را انتخاب کن.
        </p>

        <div className="space-y-2">
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
                  'flex w-full items-center gap-3 rounded-[16px] border px-3.5 py-3 text-right transition-colors',
                  active
                    ? 'border-[#3390EC]/35 bg-[#3390EC]/10 dark:border-[#8774E1]/35 dark:bg-[#8774E1]/12'
                    : 'border-white/55 bg-white/35 active:bg-white/70 dark:border-white/10 dark:bg-white/[0.04]',
                  busy && 'opacity-70',
                )}
              >
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[13px] font-black',
                    active
                      ? 'bg-[#3390EC] text-white dark:bg-[#8774E1]'
                      : 'bg-black/[0.05] text-text-muted dark:bg-white/10',
                  )}
                >
                  {account.label.slice(0, 1)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-text">{account.label}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                    {roleLabels[account.role as Role]}
                  </p>
                </div>

                {active ? (
                  <Check size={18} className="shrink-0 text-[#3390EC] dark:text-[#8774E1]" strokeWidth={2.5} />
                ) : busy ? (
                  <span className="text-[11px] font-semibold text-text-soft">…</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </BottomSheet>
    </>
  )
}
