import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'sales' | 'ghost' | 'soft' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: Variant
  size?: Size
  className?: string
  icon?: ReactNode
  disabled?: boolean
  full?: boolean
  type?: 'button' | 'submit'
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-primary-600 to-primary-500 text-white shadow-float hover:from-primary-700 hover:to-primary-600 active:from-primary-800 active:to-primary-700 dark:shadow-float-dark',
  sales:
    'bg-gradient-to-br from-secondary-500 to-accent-500 text-[#1A1200] shadow-sales hover:from-secondary-600 hover:to-accent-600 active:opacity-90',
  secondary:
    'bg-surface-soft text-primary border border-border hover:bg-surface-tint',
  soft: 'bg-primary-50 text-primary-700 dark:bg-[rgba(0,160,170,0.16)] dark:text-[#7DE8F0] dark:border dark:border-[rgba(0,160,170,0.22)]',
  ghost:
    'bg-transparent text-primary hover:bg-surface-tint dark:text-[#7DE8F0] dark:hover:bg-[rgba(0,160,170,0.12)]',
  danger:
    'bg-error text-white shadow-[0_8px_24px_-8px_rgba(229,72,77,0.5)] dark:bg-[var(--color-error)]',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm rounded-xl gap-1.5',
  md: 'h-12 px-5 text-[15px] rounded-2xl gap-2',
  lg: 'h-14 px-6 text-base rounded-2xl gap-2.5',
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className,
  icon,
  disabled,
  full,
  type = 'button',
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center font-bold transition-colors select-none',
        variants[variant],
        sizes[size],
        full && 'w-full',
        disabled && 'opacity-50',
        className,
      )}
    >
      {icon}
      {children}
    </motion.button>
  )
}
