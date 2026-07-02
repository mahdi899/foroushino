import { AnimatePresence, motion } from 'framer-motion'
import { Check, Info, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/cn'

const icons = {
  success: <Check size={16} />,
  info: <Info size={16} />,
  error: <X size={16} />,
}

const tones = {
  success:
    'bg-success-50 text-success-700 border border-success-200 dark:bg-[rgba(16,163,127,0.14)] dark:text-success-300 dark:border-[rgba(16,163,127,0.28)]',
  info: 'bg-primary-50 text-primary-700 border border-primary-200 dark:bg-[rgba(0,140,150,0.14)] dark:text-primary-300 dark:border-[rgba(0,140,150,0.28)]',
  error:
    'bg-error-50 text-error-600 border border-error-200 dark:bg-[rgba(255,92,102,0.14)] dark:text-error-300 dark:border-[rgba(255,92,102,0.28)]',
}

const iconBg = {
  success: 'bg-success-500 text-white dark:bg-success-400',
  info: 'bg-primary-600 text-white dark:bg-primary-500',
  error: 'bg-error-500 text-white dark:bg-error-400',
}

export function ToastHost() {
  const toasts = useStore((s) => s.toasts)
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[88px] z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              'pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold shadow-soft',
              tones[t.tone],
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                iconBg[t.tone],
              )}
            >
              {icons[t.tone]}
            </span>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
