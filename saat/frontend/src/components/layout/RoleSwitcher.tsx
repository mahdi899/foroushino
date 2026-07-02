import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, Check } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { roleLabels } from '@/data/labels'
import type { Role } from '@/types'
import { cn } from '@/lib/cn'

const roles: Role[] = ['agent', 'leader', 'supervisor', 'manager']

export function RoleSwitcher() {
  const [open, setOpen] = useState(false)
  const role = useStore((s) => s.role)
  const setRole = useStore((s) => s.setRole)

  return (
    <div className="absolute bottom-[150px] left-3 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="mb-2 w-44 rounded-2xl bg-neutral-900 p-1.5 shadow-soft"
          >
            <p className="px-2.5 py-1.5 text-[10px] font-bold text-neutral-400">
              حالت دمو · تغییر نقش
            </p>
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRole(r)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[13px] font-bold',
                  role === r ? 'bg-primary-600 text-white' : 'text-neutral-200',
                )}
              >
                {roleLabels[r]}
                {role === r && <Check size={15} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white shadow-soft"
      >
        <SlidersHorizontal size={17} />
      </motion.button>
    </div>
  )
}
