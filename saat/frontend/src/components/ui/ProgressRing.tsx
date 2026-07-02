import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { progressRing, salesProgressRing } from '@/lib/colors'

interface ProgressRingProps {
  value: number // 0-100
  size?: number
  stroke?: number
  children?: ReactNode
  gradient?: [string, string]
  trackColor?: string
  variant?: 'default' | 'sales'
}

export function ProgressRing({
  value,
  size = 120,
  stroke = 12,
  children,
  gradient,
  trackColor,
  variant = 'default',
}: ProgressRingProps) {
  const preset = variant === 'sales' ? salesProgressRing : progressRing
  const ringGradient = gradient ?? [preset.from, preset.to]
  const ringTrack = trackColor ?? preset.track
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference - (clamped / 100) * circumference
  const gradId = `ring-${ringGradient[0]}-${ringGradient[1]}`.replace(/[^a-z0-9]/gi, '')

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={ringGradient[0]} />
            <stop offset="100%" stopColor={ringGradient[1]} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringTrack}
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
