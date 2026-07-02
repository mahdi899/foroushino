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
    <div
      className={cn(
        'sticky top-0 z-20 flex items-center gap-2.5 px-4 pt-[calc(14px+var(--safe-top))] pb-3',
        !transparent && 'bg-background/85 glass',
      )}
    >
      <button
        onClick={() => (onBack ? onBack() : navigate(-1))}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-border/70 bg-surface text-neutral-500 shadow-sm"
      >
        <ChevronRight size={18} strokeWidth={2.25} />
      </button>
      <div className="min-w-0 flex-1 text-center">
        {title && (
          <h1 className="truncate text-[15px] font-extrabold tracking-tight text-neutral-900">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="truncate text-[11px] font-semibold text-neutral-400">{subtitle}</p>
        )}
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center">{action}</div>
    </div>
  )
}
