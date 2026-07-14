import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LeadNoteEntry } from '@/lib/leadNotes'

const AUTO_INTERVAL_MS = 4500

export function LeadNotesStrip({ notes }: { notes: LeadNoteEntry[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [notes])

  useEffect(() => {
    if (notes.length <= 1) return

    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % notes.length)
    }, AUTO_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [notes.length, notes])

  if (notes.length === 0) return null

  const current = notes[index]

  return (
    <div className="mt-2.5 w-full max-w-[240px]">
      <div className="glass-inset rounded-[14px] border border-white/50 px-2.5 py-2 dark:border-white/10">
        <div className="relative min-h-[2.25rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={current.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.42, ease: 'easeInOut' }}
              className="text-center text-[11px] font-medium leading-[1.45] text-text-muted line-clamp-2"
            >
              {current.text}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
