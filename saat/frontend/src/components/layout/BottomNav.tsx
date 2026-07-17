import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { navForRole } from '@/app/nav'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

const ACTIVE = 'text-primary-600 dark:text-primary-400'
const INACTIVE = 'text-[#8E8E93] dark:text-[#98989D]'

const spring = { type: 'spring' as const, stiffness: 500, damping: 38, mass: 0.82 }
const tapSpring = { type: 'spring' as const, stiffness: 580, damping: 32 }

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
      <motion.button
        key={item.path}
        type="button"
        whileTap={{ scale: 0.9 }}
        transition={tapSpring}
        onClick={() => {
          haptic('selection')
          navigate(item.path)
        }}
        aria-current={active ? 'page' : undefined}
        className="relative flex min-w-0 flex-1 flex-col items-center justify-end gap-[3px] pb-[7px] pt-2"
      >
        <motion.span
          className="flex h-[28px] w-[28px] items-center justify-center"
          animate={{
            scale: active ? 1.04 : 1,
            y: active ? -1 : 0,
          }}
          transition={spring}
        >
          <Icon
            active={active}
            className={cn('transition-colors duration-150', active ? ACTIVE : INACTIVE)}
          />
        </motion.span>

        <span
          className={cn(
            'max-w-full truncate px-0.5 text-[10px] leading-[11px] tracking-[-0.02em] transition-colors duration-150',
            active ? cn('font-semibold', ACTIVE) : cn('font-medium', INACTIVE),
          )}
        >
          {item.label}
        </span>
      </motion.button>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-4 pb-[calc(10px+var(--safe-bottom))]">
      <div className="pointer-events-auto relative mx-auto w-full max-w-[400px]">
        <nav
          aria-label="ناوبری اصلی"
          className="glass-tab-bar ios-tab-bar relative flex h-[56px] items-stretch rounded-[28px] px-1"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-black/[0.07] to-transparent dark:via-white/[0.1]"
          />

          {left.map(renderItem)}
          {showFab ? <div className="w-[64px] shrink-0" aria-hidden /> : null}
          {right.map(renderItem)}
        </nav>

        {showFab && onFabClick ? (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[36%]">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              transition={tapSpring}
              onClick={() => {
                haptic('medium')
                onFabClick()
              }}
              aria-label="عملیات سریع"
              className="icon-3d icon-3d-primary flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_4px_14px_rgba(0,111,117,0.32)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_16px_rgba(0,160,170,0.38)]"
            >
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] text-white" aria-hidden>
                <path
                  d="M12 5.5v13M5.5 12h13"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </motion.button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
