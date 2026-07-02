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
    }, 1600)
    return () => clearTimeout(t)
  }, [navigate, isAuthed])

  return (
    <div className="relative flex h-full min-h-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800">
      <div className="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-white/10" />
      <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-primary-400/20" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative flex h-20 w-20 items-center justify-center rounded-[22px] bg-white shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)]"
      >
        <PhoneCall size={38} className="text-primary-600" strokeWidth={2.25} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="mt-5 text-[26px] font-black text-white"
      >
        سات
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="mt-1 text-[13px] font-bold text-white/70"
      >
        دستیار فروش تیم شما
      </motion.p>
    </div>
  )
}
