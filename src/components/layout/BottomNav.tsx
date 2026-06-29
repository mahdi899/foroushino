import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { navForRole } from '@/app/nav'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

export function BottomNav({ onFabClick }: { onFabClick: () => void }) {
  const role = useStore((s) => s.role)
  const items = navForRole(role)
  const navigate = useNavigate()
  const location = useLocation()

  const left = items.slice(0, 2)
  const right = items.slice(2)

  const renderItem = (item: (typeof items)[number]) => {
    const active = location.pathname === item.path
    const Icon = item.icon
    return (
      <button
        key={item.path}
        onClick={() => {
          haptic('selection')
          navigate(item.path)
        }}
        className="flex flex-1 flex-col items-center gap-1 py-1"
      >
        <Icon
          size={22}
          className={active ? 'text-primary-600' : 'text-neutral-400'}
          strokeWidth={active ? 2.5 : 2}
        />
        <span
          className={cn(
            'text-[10px] font-bold',
            active ? 'text-primary-700' : 'text-neutral-400',
          )}
        >
          {item.label}
        </span>
      </button>
    )
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-30">
      <div className="relative bg-surface shadow-nav border-t border-border/60 pb-[var(--safe-bottom)]">
        <div className="flex h-[68px] items-center px-2">
          {left.map(renderItem)}
          <div className="w-16 shrink-0" />
          {right.map(renderItem)}
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            haptic('medium')
            onFabClick()
          }}
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-float ring-4 ring-background"
        >
          <Plus size={26} strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  )
}
