import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { BackButton } from '@/components/layout/BackButton'

interface TopBarProps {
  title?: string
  subtitle?: string
  onBack?: () => void
  showBack?: boolean
  backFallback?: string
  action?: ReactNode
  transparent?: boolean
}

export function TopBar({
  title,
  subtitle,
  onBack,
  showBack = true,
  backFallback = '/home',
  action,
  transparent,
}: TopBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 px-3 pt-[calc(6px+var(--safe-top))] pb-2.5',
        !transparent && 'glass-header',
      )}
    >
      <div className="flex items-center gap-2">
        {showBack ? (
          <BackButton onBack={onBack} fallback={backFallback} variant="glass" />
        ) : (
          <span className="h-11 w-11 shrink-0" aria-hidden />
        )}

        <div className="min-w-0 flex-1 px-1 text-center">
          {title && (
            <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-text">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-0.5 truncate text-[12px] font-medium leading-none text-text-soft">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center">
          {action ?? <span className="h-11 w-11 shrink-0" aria-hidden />}
        </div>
      </div>
    </header>
  )
}
