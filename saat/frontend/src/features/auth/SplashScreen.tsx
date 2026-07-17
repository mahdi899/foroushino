import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { SAAT_LOGO_ALT, SAAT_LOGO_AUTH_CLASS, SAAT_LOGO_SRC, SAAT_TAGLINE } from '@/lib/brand'

export function SplashScreen() {
  const navigate = useNavigate()
  const isAuthed = useStore((s) => s.isAuthed)

  useEffect(() => {
    const t = setTimeout(() => {
      navigate(isAuthed ? '/home' : '/onboarding', { replace: true })
    }, 1600)
    return () => clearTimeout(t)
  }, [navigate, isAuthed])

  return (
    <div className="relative flex h-full min-h-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800">
      <div className="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-white/10" />
      <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-primary-400/20" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative rounded-[20px] border border-white/60 bg-white px-5 py-4 shadow-[0_16px_40px_-12px_rgba(2,6,7,0.25)] dark:border-white/10 dark:bg-surface dark:shadow-black/40"
      >
        <img
          src={SAAT_LOGO_SRC}
          alt={SAAT_LOGO_ALT}
          className={SAAT_LOGO_AUTH_CLASS}
          draggable={false}
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="mt-4 text-[13px] font-bold text-white/80"
      >
        {SAAT_TAGLINE}
      </motion.p>
    </div>
  )
}
