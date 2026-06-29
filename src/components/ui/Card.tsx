import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  interactive?: boolean
  padded?: boolean
}

export function Card({
  children,
  className,
  onClick,
  interactive,
  padded = true,
}: CardProps) {
  const Comp = (interactive || onClick ? motion.button : motion.div) as typeof motion.div
  return (
    <Comp
      onClick={onClick}
      whileTap={interactive || onClick ? { scale: 0.985 } : undefined}
      className={cn(
        'block w-full text-right bg-surface rounded-3xl shadow-card border border-border/60',
        padded && 'p-4',
        className,
      )}
    >
      {children}
    </Comp>
  )
}
