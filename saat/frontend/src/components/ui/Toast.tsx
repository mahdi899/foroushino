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
  success: 'bg-neutral-900 text-white',
  info: 'bg-neutral-900 text-white',
  error: 'bg-error text-white',
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
                'flex h-6 w-6 items-center justify-center rounded-full',
                t.tone === 'error' ? 'bg-white/20' : 'bg-primary-500',
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
