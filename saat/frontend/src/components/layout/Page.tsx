import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PageProps {
  children: ReactNode
  className?: string
  withNav?: boolean
}

export function Page({ children, className, withNav = true }: PageProps) {
  return (
    <div className={cn('min-h-full', withNav && 'pb-[calc(106px+var(--safe-bottom))]', className)}>
      {children}
    </div>
  )
}
