import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { CircleUserRound, Flame, Snowflake, Sun, User, UserRound } from 'lucide-react'
import type { Lead, Temperature } from '@/types'
import { inferLeadGender } from '@/lib/leadGender'
import { leadAvatarTheme, resolveLeadPhoto } from '@/lib/leadAvatar'
import { cn } from '@/lib/cn'

const tempIcon = { hot: Flame, warm: Sun, cold: Snowflake } as const

type LeadAvatarLead = Pick<Lead, 'firstName' | 'lastName' | 'avatar' | 'temperature'>

interface LeadAvatarProps {
  lead: LeadAvatarLead
  size?: number
  ring?: boolean
  online?: boolean
  onlineClassName?: string
  className?: string
  showTempBadge?: boolean
  temperature?: Temperature
  /** Gentle motion on the fallback user icon — best for hero / priority cards */
  animated?: boolean
}

const glowPulse = {
  hot: { duration: 2.1, scale: [1, 1.14, 1], opacity: [0.42, 0.16, 0.42] },
  warm: { duration: 2.6, scale: [1, 1.1, 1], opacity: [0.34, 0.14, 0.34] },
  cold: { duration: 3.2, scale: [1, 1.08, 1], opacity: [0.28, 0.12, 0.28] },
} as const

export function LeadAvatar({
  lead,
  size = 48,
  ring,
  online,
  onlineClassName,
  className,
  showTempBadge = false,
  temperature,
  animated = false,
}: LeadAvatarProps) {
  const reduceMotion = useReducedMotion()
  const temp = temperature ?? lead.temperature
  const theme = leadAvatarTheme[temp]
  const gender = inferLeadGender(lead.firstName)
  const PortraitIcon = gender === 'female' ? UserRound : gender === 'male' ? User : CircleUserRound
  const TempIcon = tempIcon[temp]
  const photo = resolveLeadPhoto(lead.avatar)
  const [imgFailed, setImgFailed] = useState(false)
  const showPhoto = !!photo && !imgFailed
  const iconSize = Math.max(16, Math.round(size * 0.4))
  const shouldAnimate = animated && !showPhoto && !reduceMotion
  const pulse = glowPulse[temp]

  useEffect(() => {
    setImgFailed(false)
  }, [photo])

  const avatarShell = (
    <>
      {showPhoto ? (
        <img
          src={photo}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <>
          {shouldAnimate ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
            >
              <motion.div
                className="absolute inset-y-0 w-[55%] bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/12"
                animate={{ x: ['-130%', '230%'] }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  repeatDelay: 1.8,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          ) : null}

          <motion.div
            className="relative z-[1] flex items-center justify-center"
            animate={shouldAnimate ? { y: [0, -2.5, 0] } : undefined}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.div
              animate={shouldAnimate ? { scale: [1, 1.06, 1] } : undefined}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
            >
              <PortraitIcon size={iconSize} className={theme.icon} strokeWidth={2.15} />
            </motion.div>
          </motion.div>
        </>
      )}
    </>
  )

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {shouldAnimate ? (
        <motion.span
          aria-hidden
          className={cn('pointer-events-none absolute inset-0 rounded-full', theme.glow)}
          animate={{ scale: pulse.scale, opacity: pulse.opacity }}
          transition={{ duration: pulse.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}

      {shouldAnimate ? (
        <motion.div
          className={cn(
            'relative flex h-full w-full items-center justify-center overflow-hidden rounded-full',
            ring && cn('ring-2 shadow-soft', theme.ring),
            !showPhoto && theme.bg,
            className,
          )}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {avatarShell}
        </motion.div>
      ) : (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center overflow-hidden rounded-full',
            ring && cn('ring-2 shadow-soft', theme.ring),
            !showPhoto && theme.bg,
            className,
          )}
        >
          {avatarShell}
        </div>
      )}

      {showTempBadge && (
        <motion.span
          className={cn(
            'absolute -bottom-0.5 -left-0.5 z-[2] flex items-center justify-center rounded-full ring-2 ring-white dark:ring-[#232E38]',
            theme.badge,
          )}
          style={{ width: size * 0.3, height: size * 0.3 }}
          animate={shouldAnimate && temp === 'hot' ? { scale: [1, 1.12, 1] } : undefined}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <TempIcon size={Math.max(10, size * 0.16)} strokeWidth={2.5} />
        </motion.span>
      )}

      {online && (
        <span
          className={cn(
            'absolute bottom-0 left-0 z-[2] rounded-full ring-2 ring-white',
            onlineClassName ?? 'bg-success-500',
          )}
          style={{ width: size * 0.26, height: size * 0.26 }}
        />
      )}
    </div>
  )
}
