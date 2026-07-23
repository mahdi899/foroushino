import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { BackButton } from '@/components/layout/BackButton'

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
  /**
   * When true, subtitle renders as an end-aligned badge on the title row.
   * When false (default), subtitle sits under the title as a single truncated line.
   */
  subtitleInline?: boolean
  sticky?: boolean
  /** Shows a back chevron with smart history fallback. */
  showBack?: boolean
  onBack?: () => void
  /** Fallback route when history is empty. */
  backFallback?: string
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
  backFallback = '/home',
  action,
  children,
  className,
}: ScreenHeaderProps) {
  return (
    <div
      className={cn(
        'px-4 pt-[calc(6px+var(--safe-top))]',
        sticky && 'sticky top-0 z-20 overflow-visible glass-header',
        className,
      )}
    >
      <div className="flex items-center gap-2 pb-1.5">
        {showBack && (
          <BackButton onBack={onBack} fallback={backFallback} variant="soft" />
        )}

        <div className="min-w-0 flex-1">
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

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-[18px] font-bold leading-tight tracking-[-0.02em] text-text">
                  {title}
                </h1>
                {subtitleInline && subtitle && (
                  <span className="shrink-0 rounded-full bg-black/[0.05] px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-text-soft dark:bg-white/[0.08]">
                    {subtitle}
                  </span>
                )}
              </div>
              {!subtitleInline && subtitle && (
                <p className="mt-0.5 truncate text-[12px] font-medium leading-snug text-text-soft">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {children && <div className="pb-2 pt-1">{children}</div>}
    </div>
  )
}
