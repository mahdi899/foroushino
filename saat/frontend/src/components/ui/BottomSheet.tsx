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

export function BottomSheet({ open, onClose, children, title, className }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-neutral-900/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 360 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose()
            }}
            className={cn(
              'absolute inset-x-0 bottom-0 z-50 bg-surface rounded-t-[28px] shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.25)]',
              'max-h-[88%] flex flex-col',
              className,
            )}
          >
            <div className="pt-3 pb-1 flex justify-center shrink-0">
              <div className="h-1.5 w-11 rounded-full bg-neutral-200" />
            </div>
            {title && (
              <div className="px-5 pt-1 pb-3 shrink-0">
                <h3 className="text-lg font-extrabold text-neutral-900">{title}</h3>
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
