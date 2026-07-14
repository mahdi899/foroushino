import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutGroup, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { navForRole } from '@/app/nav'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

const ACTIVE = 'text-[#3390EC] dark:text-[#8774E1]'
const INACTIVE = 'text-[#8E8E93] dark:text-[#98989D]'

export function BottomNav({
  onFabClick,
  showFab = true,
}: {
  onFabClick?: () => void
  showFab?: boolean
}) {
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
        className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-[3px] py-2"
      >
        {active && (
          <motion.span
            layoutId="tg-nav-pill"
            transition={{ type: 'spring', stiffness: 440, damping: 36 }}
            className="absolute inset-x-1.5 inset-y-1 rounded-[18px] bg-[#3390EC]/12 dark:bg-[#8774E1]/16"
          />
        )}
        <Icon
          size={24}
          className={cn(
            'relative z-[1] transition-colors duration-150',
            active ? ACTIVE : INACTIVE,
          )}
          strokeWidth={active ? 2.25 : 1.85}
        />
        <span
          className={cn(
            'relative z-[1] max-w-full truncate px-0.5 text-[10px] leading-none transition-colors duration-150',
            active ? cn('font-semibold', ACTIVE) : cn('font-medium', INACTIVE),
          )}
        >
          {item.label}
        </span>
      </button>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3.5 pb-[calc(10px+var(--safe-bottom))]">
      <div className="pointer-events-auto relative mx-auto w-full">
        <LayoutGroup id="tg-bottom-nav">
          <nav className="glass-nav flex h-[54px] items-stretch rounded-[27px] px-0.5">
            {left.map(renderItem)}
            {showFab ? <div className="w-[60px] shrink-0" aria-hidden /> : null}
            {right.map(renderItem)}
          </nav>
        </LayoutGroup>

        {showFab && onFabClick ? (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[40%]">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                haptic('medium')
                onFabClick()
              }}
              aria-label="عملیات سریع"
              className={cn(
                'glass-fab flex h-[52px] w-[52px] items-center justify-center rounded-full',
                ACTIVE,
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3390EC] text-white dark:bg-[#8774E1]">
                <Plus size={22} strokeWidth={2.5} />
              </span>
            </motion.button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
