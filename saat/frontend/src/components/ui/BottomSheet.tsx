import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  className?: string
}

const sheetSpring = { type: 'spring' as const, damping: 34, stiffness: 380 }

export function BottomSheet({ open, onClose, children, title, className }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-black/30 backdrop-blur-[6px]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetSpring}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose()
            }}
            className={cn(
              'glass-nav absolute inset-x-0 bottom-0 z-50 flex max-h-[88%] flex-col',
              'rounded-t-[28px] border-t border-white/70 dark:border-white/10',
              className,
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/12" />

            <div className="flex shrink-0 justify-center pb-1 pt-3">
              <div className="glass-inset h-1.5 w-11 rounded-full border border-white/50 dark:border-white/10" />
            </div>

            {title && (
              <div className="shrink-0 px-5 pb-3 pt-1">
                <h3 className="text-[17px] font-bold tracking-tight text-text">{title}</h3>
              </div>
            )}

            <div className="overflow-y-auto no-scrollbar px-5 pb-[calc(20px+var(--safe-bottom))]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
