import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PageProps {
  children: ReactNode
  className?: string
  withNav?: boolean
}

export function Page({ children, className, withNav = true }: PageProps) {
  return (
    <div
      className={cn(
        'font-sans',
        withNav
          ? 'min-h-full pb-[calc(88px+var(--safe-bottom))]'
          : 'min-h-full',
        className,
      )}
    >
      {children}
    </div>
  )
}
