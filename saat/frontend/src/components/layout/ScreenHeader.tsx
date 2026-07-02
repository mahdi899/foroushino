import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

type IconTone = 'primary' | 'secondary' | 'accent' | 'warning' | 'success'

const iconToneStyles: Record<IconTone, string> = {
  primary: 'bg-primary-50 text-primary-600 border-primary-100/70',
  secondary: 'bg-secondary-50 text-secondary-500 border-secondary-100/70',
  accent: 'bg-accent-50 text-accent-600 border-accent-100/70',
  warning: 'bg-warning-50 text-warning-600 border-warning-100/70',
  success: 'bg-success-50 text-success-600 border-success-100/70',
}

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  iconTone?: IconTone
  sticky?: boolean
  action?: ReactNode
  children?: ReactNode
  className?: string
}

export function ScreenHeader({
  title,
  subtitle,
  icon: Icon,
  iconTone = 'primary',
  sticky,
  action,
  children,
  className,
}: ScreenHeaderProps) {
  return (
    <div
      className={cn(
        'px-4 pt-[calc(14px+var(--safe-top))] pb-3',
        sticky && 'sticky top-0 z-20 overflow-visible bg-background/85 glass',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border shadow-sm',
                iconToneStyles[iconTone],
              )}
            >
              <Icon size={18} strokeWidth={2.25} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-extrabold tracking-tight text-neutral-900">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 truncate text-[11px] font-semibold text-neutral-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  )
}
