import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useSmartBack } from '@/hooks/useSmartBack'

interface BackButtonProps {
  onBack?: () => void
  /** Used when history is empty and `onBack` is not provided. */
  fallback?: string
  className?: string
  /** Visual variant — glass for TopBar, soft for ScreenHeader. */
  variant?: 'glass' | 'soft'
}

export function BackButton({
  onBack,
  fallback = '/home',
  className,
  variant = 'soft',
}: BackButtonProps) {
  const smartBack = useSmartBack(fallback)

  return (
    <button
      type="button"
      onClick={() => (onBack ? onBack() : smartBack())}
      aria-label="بازگشت"
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors active:scale-[0.94]',
        variant === 'glass'
          ? 'glass-inset text-[#3390EC] shadow-sm dark:text-[#8774E1]'
          : 'bg-black/[0.05] text-primary-600 active:bg-black/[0.08] dark:bg-white/[0.08] dark:text-primary-400',
        className,
      )}
    >
      <ChevronRight size={20} strokeWidth={2.25} />
    </button>
  )
}
