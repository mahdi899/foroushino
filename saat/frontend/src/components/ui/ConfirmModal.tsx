import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/cn'

interface ConfirmModalProps {
  open: boolean
  title: string
  description?: ReactNode
  icon?: LucideIcon
  tone?: 'primary' | 'success' | 'error' | 'warning'
  confirmLabel?: string
  cancelLabel?: string
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
}

const toneClass: Record<NonNullable<ConfirmModalProps['tone']>, string> = {
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-success-50 text-success-600',
  error: 'bg-error-50 text-error-600',
  warning: 'bg-warning-50 text-warning-600',
}

export function ConfirmModal({
  open,
  title,
  description,
  icon: Icon,
  tone = 'primary',
  confirmLabel = 'تایید',
  cancelLabel = 'انصراف',
  confirmDisabled,
  onConfirm,
  onCancel,
  children,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 z-[60] bg-neutral-900/45 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="absolute inset-x-6 top-1/2 z-[70] -translate-y-1/2 rounded-3xl bg-surface p-5 shadow-float"
          >
            <div className="flex flex-col items-center text-center">
              {Icon && (
                <span className={cn('mb-3 flex h-14 w-14 items-center justify-center rounded-2xl', toneClass[tone])}>
                  <Icon size={26} strokeWidth={2.25} />
                </span>
              )}
              <h3 className="text-[16px] font-extrabold text-neutral-900">{title}</h3>
              {description && (
                <p className="mt-1.5 text-[12.5px] font-bold leading-6 text-neutral-500">{description}</p>
              )}
            </div>

            {children && <div className="mt-4">{children}</div>}

            <div className="mt-5 flex gap-2.5">
              <Button variant="soft" size="md" className="flex-1" onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button
                size="md"
                className="flex-1"
                variant={tone === 'error' ? 'danger' : 'primary'}
                disabled={confirmDisabled}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
