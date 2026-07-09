import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { fetchDemoAccounts, type DemoAccount } from '@/services/auth'
import { toFa } from '@/lib/format'
import { cn } from '@/lib/cn'

interface DemoAccountsPanelProps {
  onPickPhone: (phone: string) => void
  className?: string
}

export function DemoAccountsPanel({ onPickPhone, className }: DemoAccountsPanelProps) {
  const [accounts, setAccounts] = useState<DemoAccount[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    void fetchDemoAccounts().then(setAccounts)
  }, [])

  if (accounts.length === 0) return null

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[12px] border border-[#E5E5E5] dark:border-[#2B3945]',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between gap-3 px-3.5 py-3 text-right',
          open
            ? 'bg-[#F8F9FA] dark:bg-[#242F3D]'
            : 'bg-transparent active:bg-[#F8F9FA]/80 dark:active:bg-[#242F3D]/60',
        )}
      >
        <span className="text-[13px] font-medium text-[#707579] dark:text-[#8E9396]">
          راهنمای ورود دمو
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2.25}
          className={cn(
            'shrink-0 text-[#A8A8A8] transition-transform duration-200 dark:text-[#5E6770]',
            open && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="demo-accounts"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-1 border-t border-[#E5E5E5] bg-[#F8F9FA] p-2 dark:border-[#2B3945] dark:bg-[#242F3D]">
              {accounts.map((account) => (
                <button
                  key={account.phone}
                  type="button"
                  onClick={() => {
                    onPickPhone(account.phone)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full flex-col gap-0.5 rounded-[10px] px-3 py-2.5 text-right',
                    'active:bg-white dark:active:bg-[#17212B]',
                  )}
                >
                  <span className="text-[13px] font-semibold text-[#3390EC] dark:text-[#54A9EB]">
                    {account.label}
                  </span>
                  <span
                    dir="ltr"
                    className="text-left text-[12px] tabular-nums text-[#707579] dark:text-[#8E9396]"
                  >
                    {toFa(account.phone)}
                    <span className="mx-1.5 text-[#C4C9CC] dark:text-[#4A5560]">·</span>
                    {toFa(account.otp)}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
