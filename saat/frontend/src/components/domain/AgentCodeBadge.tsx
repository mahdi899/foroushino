import { Copy } from 'lucide-react'
import { toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

interface AgentCodeBadgeProps {
  code: number
  onCopied?: (message: string) => void
  onCopyError?: (message: string) => void
  className?: string
  compact?: boolean
}

export function AgentCodeBadge({
  code,
  onCopied,
  onCopyError,
  className,
  compact = false,
}: AgentCodeBadgeProps) {
  const copyCode = () => {
    haptic('selection')
    void navigator.clipboard?.writeText(String(code)).then(
      () => onCopied?.('شناسه کارشناس کپی شد'),
      () => onCopyError?.('کپی ناموفق بود'),
    )
  }

  return (
    <button
      type="button"
      onClick={copyCode}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-white/55 bg-white/35 transition-colors active:bg-black/[0.04] dark:border-white/10 dark:bg-white/8 dark:active:bg-white/[0.06]',
        compact ? 'px-2.5 py-1' : 'px-3 py-1.5',
        className,
      )}
      aria-label="کپی شناسه کارشناس"
    >
      <span className="text-[10px] font-bold text-text-soft">شناسه</span>
      <span className="ltr-nums text-[12px] font-black tabular-nums text-text">{toFa(code)}</span>
      <Copy size={12} className="text-[#3390EC] dark:text-[#8774E1]" />
    </button>
  )
}
