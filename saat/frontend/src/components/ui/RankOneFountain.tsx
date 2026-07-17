import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Star, Trophy } from 'lucide-react'
import { cn } from '@/lib/cn'

const COLORS = ['#FBBF24', '#F59E0B', '#FDE047', '#3390EC', '#8774E1', '#34D399', '#FB923C', '#F472B6']

type FountainParticle = {
  id: number
  dx: number
  dy: number
  size: number
  color: string
  delay: number
  duration: number
  shape: 'dot' | 'bar' | 'diamond'
  rotate: number
}

type FloatIcon = {
  id: number
  dx: number
  dy: number
  delay: number
  duration: number
  kind: 'star' | 'sparkle' | 'trophy'
}

function buildFountainParticles(count: number): FountainParticle[] {
  return Array.from({ length: count }, (_, id) => {
    const spread = ((id % count) / count) * 160 - 80
    const power = 0.65 + (id % 5) * 0.12
    return {
      id,
      dx: spread * power,
      dy: -(38 + (id % 4) * 14) * power,
      size: 3 + (id % 4),
      color: COLORS[id % COLORS.length] ?? '#FBBF24',
      delay: (id % 6) * 0.14,
      duration: 1.35 + (id % 3) * 0.25,
      shape: id % 3 === 0 ? 'bar' : id % 3 === 1 ? 'diamond' : 'dot',
      rotate: (id % 8) * 45,
    }
  })
}

function buildFloatIcons(count: number): FloatIcon[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    dx: ((id % count) / count) * 90 - 45,
    dy: -(28 + (id % 3) * 16),
    delay: 0.2 + (id % 4) * 0.35,
    duration: 1.8 + (id % 2) * 0.4,
    kind: id % 3 === 0 ? 'trophy' : id % 3 === 1 ? 'star' : 'sparkle',
  }))
}

const PROFILE_PARTICLES = buildFountainParticles(20)
const COMPACT_PARTICLES = buildFountainParticles(10)
const PROFILE_ICONS = buildFloatIcons(6)
const COMPACT_ICONS = buildFloatIcons(3)

interface RankOneFountainProps {
  variant?: 'compact' | 'profile'
}

export function RankOneFountain({ variant = 'profile' }: RankOneFountainProps) {
  const scale = variant === 'compact' ? 0.62 : 1
  const particles = variant === 'compact' ? COMPACT_PARTICLES : PROFILE_PARTICLES
  const icons = variant === 'compact' ? COMPACT_ICONS : PROFILE_ICONS
  const spread = useMemo(() => (variant === 'compact' ? 0.72 : 1), [variant])

  return (
    <div
      className={cn(
        'pointer-events-none absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 overflow-visible',
        variant === 'compact' ? 'h-[72px] w-[72px]' : 'h-[130px] w-[130px]',
      )}
      aria-hidden
    >
      {[0, 1, 2].map((wave) => (
        <motion.div
          key={wave}
          className="absolute left-1/2 top-1/2 rounded-full border border-amber-300/55"
          style={{ width: 52 * scale, height: 52 * scale, x: '-50%', y: '-50%' }}
          animate={{
            width: [52 * scale, 96 * scale, 124 * scale],
            height: [52 * scale, 96 * scale, 124 * scale],
            opacity: [0.55, 0.22, 0],
          }}
          transition={{
            duration: 2.1,
            repeat: Infinity,
            ease: 'easeOut',
            delay: wave * 0.62,
          }}
        />
      ))}

      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className={cn(
            'absolute left-1/2 top-1/2',
            particle.shape === 'dot' && 'rounded-full',
            particle.shape === 'bar' && 'rounded-[2px]',
            particle.shape === 'diamond' && 'rotate-45 rounded-[1px]',
          )}
          style={{
            width: particle.shape === 'bar' ? particle.size * 2.2 * scale : particle.size * scale,
            height: particle.shape === 'bar' ? particle.size * 0.75 * scale : particle.size * scale,
            backgroundColor: particle.color,
            boxShadow: `0 0 ${6 * scale}px ${particle.color}55`,
          }}
          animate={{
            x: [0, particle.dx * spread * scale, particle.dx * 1.15 * spread * scale],
            y: [0, particle.dy * spread * scale, particle.dy * 1.35 * spread * scale + 18 * scale],
            opacity: [0, 1, 0.85, 0],
            rotate: [particle.rotate, particle.rotate + 120, particle.rotate + 240],
            scale: [0.2, 1.15, 0.35],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: 'easeOut',
            delay: particle.delay,
          }}
        />
      ))}

      {icons.map((icon) => (
        <motion.span
          key={icon.id}
          className="absolute left-1/2 top-1/2 text-amber-400"
          animate={{
            x: [0, icon.dx * scale, icon.dx * 1.1 * scale],
            y: [0, icon.dy * scale, icon.dy * 1.2 * scale + 12 * scale],
            opacity: [0, 1, 0],
            scale: [0.4, 1, 0.5],
            rotate: [0, icon.id % 2 === 0 ? 18 : -18, 0],
          }}
          transition={{
            duration: icon.duration,
            repeat: Infinity,
            ease: 'easeOut',
            delay: icon.delay,
          }}
        >
          {icon.kind === 'trophy' && (
            <Trophy size={variant === 'compact' ? 9 : 12} fill="currentColor" strokeWidth={1.5} />
          )}
          {icon.kind === 'star' && (
            <Star size={variant === 'compact' ? 8 : 11} fill="currentColor" strokeWidth={1.5} />
          )}
          {icon.kind === 'sparkle' && (
            <Sparkles size={variant === 'compact' ? 8 : 11} strokeWidth={2.25} />
          )}
        </motion.span>
      ))}

      <motion.div
        className="absolute bottom-[8%] left-1/2 h-[3px] w-[42%] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-amber-300/80 to-transparent blur-[1px]"
        animate={{ opacity: [0.2, 0.9, 0.2], scaleX: [0.7, 1.15, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
