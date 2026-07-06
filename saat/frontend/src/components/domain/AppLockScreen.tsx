import { motion } from 'framer-motion'
import { Lock, ShieldCheck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { haptic } from '@/lib/telegram'

export function AppLockScreen() {
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const unlockApp = useStore((s) => s.unlockApp)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-neutral-950/97 px-8 text-center backdrop-blur-md"
    >
      <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-white">
        <Lock size={32} />
      </span>
      <div>
        <h2 className="text-lg font-black text-white">
          {agent ? `${agent.firstName} ${agent.lastName}` : 'برنامه قفل شده'}
        </h2>
        <p className="mt-2 max-w-[260px] text-[12.5px] font-bold leading-6 text-white/60">
          به دلیل عدم فعالیت، برنامه برای حفظ محرمانگی اطلاعات مشتریان قفل شد.
        </p>
      </div>
      <Button
        size="lg"
        className="!bg-white !text-neutral-900"
        icon={<ShieldCheck size={18} />}
        onClick={() => {
          haptic('success')
          unlockApp()
        }}
      >
        ادامه کار
      </Button>
    </motion.div>
  )
}
