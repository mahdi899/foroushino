import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutGroup, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { navForRole } from '@/app/nav'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

const ACTIVE = 'text-[#3390EC] dark:text-[#8774E1]'
const INACTIVE = 'text-[#AEAEB2] dark:text-[#636366]'

const spring = { type: 'spring' as const, stiffness: 480, damping: 38 }

function isNavActive(pathname: string, path: string) {
  if (path === '/home') return pathname === '/home'
  return pathname === path || pathname.startsWith(`${path}/`)
}

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
    const active = isNavActive(location.pathname, item.path)
    const Icon = item.icon

    return (
      <button
        key={item.path}
        type="button"
        onClick={() => {
          haptic('selection')
          navigate(item.path)
        }}
        aria-current={active ? 'page' : undefined}
        className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-[5px] py-2.5"
      >
        <span
          className={cn(
            'relative z-[1] flex h-[26px] w-[26px] items-center justify-center transition-transform duration-200',
            active && 'scale-[1.04]',
          )}
        >
          <Icon
            size={22}
            className={cn('transition-colors duration-200', active ? ACTIVE : INACTIVE)}
            strokeWidth={active ? 2.35 : 1.9}
            fill={active ? 'currentColor' : 'none'}
            fillOpacity={active ? 0.14 : undefined}
          />
        </span>

        <span
          className={cn(
            'relative z-[1] max-w-full truncate px-1 text-[10px] leading-none tracking-tight transition-all duration-200',
            active ? cn('font-bold', ACTIVE) : cn('font-medium', INACTIVE),
          )}
        >
          {item.label}
        </span>

        {active && (
          <motion.span
            layoutId="tg-nav-indicator"
            transition={spring}
            className="absolute bottom-1 left-1/2 z-[1] h-[2.5px] w-[18px] -translate-x-1/2 rounded-full bg-[#3390EC] dark:bg-[#8774E1]"
          />
        )}
      </button>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-4 pb-[calc(12px+var(--safe-bottom))]">
      <div className="pointer-events-auto relative mx-auto w-full max-w-[400px]">
        <LayoutGroup id="tg-bottom-nav">
          <nav
            aria-label="ناوبری اصلی"
            className={cn(
              'glass-nav relative flex h-[58px] items-stretch rounded-[29px]',
              'border border-white/60 px-0.5 dark:border-white/10',
            )}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/12"
            />

            {left.map(renderItem)}
            {showFab ? <div className="w-[64px] shrink-0" aria-hidden /> : null}
            {right.map(renderItem)}
          </nav>
        </LayoutGroup>

        {showFab && onFabClick ? (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[42%]">
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                haptic('medium')
                onFabClick()
              }}
              aria-label="عملیات سریع"
              className="relative flex h-[54px] w-[54px] items-center justify-center"
            >
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-background shadow-[0_0_0_3px_rgba(255,255,255,0.85)] dark:shadow-[0_0_0_3px_rgba(5,10,11,0.95)]"
              />
              <span
                className={cn(
                  'absolute inset-[3px] rounded-full',
                  'bg-gradient-to-br from-[#3390EC] to-[#5EB0FF]',
                  'shadow-[0_10px_28px_-6px_rgba(51,144,236,0.62)]',
                  'dark:from-[#8774E1] dark:to-[#A894EE] dark:shadow-[0_10px_28px_-6px_rgba(135,116,225,0.55)]',
                )}
              />
              <span
                aria-hidden
                className="absolute inset-[5px] rounded-full bg-gradient-to-b from-white/30 to-transparent"
              />
              <Plus size={24} strokeWidth={2.5} className="relative z-[1] text-white" />
            </motion.button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
