import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  description?: string
  className?: string
}

const sheetSpring = { type: 'spring' as const, damping: 34, stiffness: 380 }

export function BottomSheet({ open, onClose, children, title, description, className }: BottomSheetProps) {
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
              'glass-sheet absolute inset-x-0 bottom-0 z-50 flex max-h-[88%] flex-col',
              'rounded-t-[20px]',
              className,
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-black/[0.08] dark:bg-white/[0.1]" />

            <div className="flex shrink-0 justify-center pb-1 pt-2.5">
              <div className="h-[5px] w-9 rounded-full bg-black/15 dark:bg-white/20" />
            </div>

            {title && (
              <div className="shrink-0 px-5 pb-2 pt-0.5 text-center">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.02em] text-text-muted">
                  {title}
                </h3>
                {description ? (
                  <p className="mt-1 text-[12px] font-medium leading-relaxed text-text-muted/80">
                    {description}
                  </p>
                ) : null}
              </div>
            )}

            <div className="overflow-y-auto no-scrollbar px-4 pb-[calc(16px+var(--safe-bottom))] pt-1">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
