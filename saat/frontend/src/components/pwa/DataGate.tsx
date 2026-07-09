import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { useOnline } from '@/lib/network'
import { useRemoteDataReady } from '@/providers/SyncProvider'

export function OfflineBanner() {
  const online = useOnline()
  const { needsNetwork } = useRemoteDataReady()

  if (!needsNetwork || online) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -48, opacity: 0 }}
        className="pointer-events-none absolute inset-x-0 top-0 z-[80] flex justify-center px-3 pt-[max(8px,var(--safe-top))]"
      >
        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-neutral-900/90 px-3.5 py-2 text-[12px] font-semibold text-white shadow-lg backdrop-blur-md">
          <WifiOff size={14} />
          آفلاین — بخش‌های داده‌محور موقتاً مخفی‌اند
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

interface DataGateProps {
  children: ReactNode
  /** Shown while syncing or offline. Defaults to hidden. */
  fallback?: ReactNode
  /** Keep shell/header visible but replace only the data block. */
  mode?: 'hide' | 'placeholder'
}

export function DataGate({ children, fallback = null, mode = 'hide' }: DataGateProps) {
  const { showData, syncing } = useRemoteDataReady()

  if (showData) return <>{children}</>

  if (mode === 'placeholder') {
    if (syncing) {
      return (
        fallback ?? (
          <div className="mx-4 rounded-[20px] border border-border/60 bg-surface-soft px-4 py-8 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <p className="text-sm font-semibold text-text">در حال دریافت داده‌ها…</p>
          </div>
        )
      )
    }

    return fallback
  }

  return fallback
}
