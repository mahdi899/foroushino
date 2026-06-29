import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

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
      className={
        'sticky top-0 z-20 flex items-center gap-2 px-4 pt-[calc(12px+var(--safe-top))] pb-3 ' +
        (transparent ? '' : 'bg-background/85 glass')
      }
    >
      <button
        onClick={() => (onBack ? onBack() : navigate(-1))}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-card border border-border/60 text-neutral-600"
      >
        <ChevronRight size={20} />
      </button>
      <div className="min-w-0 flex-1 text-center">
        {title && <h1 className="truncate text-base font-extrabold text-neutral-900">{title}</h1>}
        {subtitle && <p className="truncate text-[11px] font-bold text-neutral-400">{subtitle}</p>}
      </div>
      <div className="flex h-10 w-10 items-center justify-center">{action}</div>
    </div>
  )
}
