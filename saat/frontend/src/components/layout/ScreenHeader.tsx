import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

type IconTone = 'primary' | 'secondary' | 'accent' | 'warning' | 'success'

const iconToneColors: Record<IconTone, string> = {
  primary: 'text-white',
  secondary: 'text-[#1A1200]',
  accent: 'text-white',
  warning: 'text-[#1A1200]',
  success: 'text-white',
}

const iconToneWrap: Record<IconTone, string> = {
  primary: 'icon-3d icon-3d-primary',
  secondary: 'icon-3d icon-3d-warning',
  accent: 'icon-3d icon-3d-primary',
  warning: 'icon-3d icon-3d-warning',
  success: 'icon-3d icon-3d-success',
}

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  iconTone?: IconTone
  /** Title and subtitle on one row (subtitle aligned end). */
  subtitleInline?: boolean
  sticky?: boolean
  /** Shows a back chevron; defaults to `navigate(-1)` unless `onBack` is set. */
  showBack?: boolean
  onBack?: () => void
  action?: ReactNode
  children?: ReactNode
  className?: string
}

export function ScreenHeader({
  title,
  subtitle,
  icon: Icon,
  iconTone = 'primary',
  subtitleInline = false,
  sticky,
  showBack,
  onBack,
  action,
  children,
  className,
}: ScreenHeaderProps) {
  const navigate = useNavigate()

  return (
    <div
      className={cn(
        'px-4 pt-[calc(8px+var(--safe-top))]',
        sticky && 'sticky top-0 z-20 overflow-visible glass-header',
        className,
      )}
    >
      <div className="flex items-start gap-2.5 pb-1">
        {showBack && (
          <button
            type="button"
            onClick={() => (onBack ? onBack() : navigate(-1))}
            aria-label="بازگشت"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-primary-600 transition-colors active:scale-[0.92] active:bg-black/[0.08] dark:bg-white/[0.08] dark:text-primary-400"
          >
            <ChevronRight size={19} strokeWidth={2.25} />
          </button>
        )}

        <div className="min-w-0 flex-1">
          {subtitleInline && (subtitle || Icon) ? (
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                {Icon && (
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px]',
                      iconToneWrap[iconTone],
                    )}
                  >
                    <Icon size={15} strokeWidth={2.35} className={iconToneColors[iconTone]} />
                  </span>
                )}
                <h1 className="truncate text-[22px] font-bold leading-tight tracking-[-0.02em] text-text">
                  {title}
                </h1>
              </div>
              {subtitle && (
                <span className="shrink-0 rounded-full bg-black/[0.05] px-2.5 py-1 text-[12px] font-semibold tabular-nums text-text-soft dark:bg-white/[0.08]">
                  {subtitle}
                </span>
              )}
            </div>
          ) : (
            <>
              <h1 className="truncate text-[28px] font-bold leading-[1.12] tracking-[-0.02em] text-text">
                {title}
              </h1>
              {(subtitle || Icon) && (
                <div className="mt-1 flex min-w-0 items-center gap-1.5">
                  {Icon && (
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px]',
                        iconToneWrap[iconTone],
                      )}
                    >
                      <Icon size={14} strokeWidth={2.35} className={iconToneColors[iconTone]} />
                    </span>
                  )}
                  {subtitle && (
                    <p className="truncate text-[13px] font-medium text-text-soft">{subtitle}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        {action && <div className="shrink-0 pt-0.5">{action}</div>}
      </div>

      {children && <div className="pb-2 pt-1.5">{children}</div>}
    </div>
  )
}
