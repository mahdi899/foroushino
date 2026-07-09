import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface TopBarProps {
  title?: string
  subtitle?: string
  onBack?: () => void
  action?: ReactNode
  transparent?: boolean
}

export function TopBar({ title, subtitle, onBack, action, transparent }: TopBarProps) {
  const navigate = useNavigate()

  return (
    <header
      className={cn(
        'sticky top-0 z-20 px-3 pt-[calc(6px+var(--safe-top))] pb-2.5',
        !transparent && 'glass-header',
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : navigate(-1))}
          aria-label="بازگشت"
          className="glass-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#3390EC] shadow-sm transition-all active:scale-95 dark:text-[#8774E1]"
        >
          <ChevronRight size={20} strokeWidth={2.25} />
        </button>

        <div className="min-w-0 flex-1 px-1 text-center">
          {title && (
            <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-neutral-900 dark:text-white">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-0.5 truncate text-[13px] font-medium leading-none text-[#8E8E93] dark:text-[#98989D]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center">
          {action ?? <span className="h-9 w-9 shrink-0" aria-hidden />}
        </div>
      </div>
    </header>
  )
}
