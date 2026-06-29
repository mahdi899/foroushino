import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PhoneCall } from 'lucide-react'
import { useStore } from '@/store/useStore'

export function SplashScreen() {
  const navigate = useNavigate()
  const isAuthed = useStore((s) => s.isAuthed)

  useEffect(() => {
    const t = setTimeout(() => {
      navigate(isAuthed ? '/home' : '/onboarding', { replace: true })
    }, 1900)
    return () => clearTimeout(t)
  }, [navigate, isAuthed])

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800">
      <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-primary-400/30 blur-2xl" />

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 16, stiffness: 200 }}
        className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-white shadow-2xl"
      >
        <PhoneCall size={44} className="text-primary-600" />
        <span className="absolute inset-0 animate-pulse-ring rounded-[28px] ring-4 ring-white/40" />
      </motion.div>

      <motion.h1
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="mt-6 text-3xl font-black text-white"
      >
        فروشینو
      </motion.h1>
      <motion.p
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-1.5 text-sm font-bold text-white/70"
      >
        دستیار فروش تیم شما
      </motion.p>
    </div>
  )
}
