import { useEffect, useState } from 'react'
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
}

export function LeadAvatar({
  lead,
  size = 48,
  ring,
  online,
  onlineClassName,
  className,
  showTempBadge = false,
  temperature,
}: LeadAvatarProps) {
  const temp = temperature ?? lead.temperature
  const theme = leadAvatarTheme[temp]
  const gender = inferLeadGender(lead.firstName)
  const PortraitIcon = gender === 'female' ? UserRound : gender === 'male' ? User : CircleUserRound
  const TempIcon = tempIcon[temp]
  const photo = resolveLeadPhoto(lead.avatar)
  const [imgFailed, setImgFailed] = useState(false)
  const showPhoto = !!photo && !imgFailed
  const iconSize = Math.max(16, Math.round(size * 0.4))

  useEffect(() => {
    setImgFailed(false)
  }, [photo])

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={cn(
          'flex h-full w-full items-center justify-center overflow-hidden rounded-full',
          ring && cn('ring-2 shadow-soft', theme.ring),
          !showPhoto && theme.bg,
          className,
        )}
      >
        {showPhoto ? (
          <img
            src={photo}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <PortraitIcon size={iconSize} className={theme.icon} strokeWidth={2.1} />
        )}
      </div>

      {showTempBadge && (
        <span
          className={cn(
            'absolute -bottom-0.5 -left-0.5 flex items-center justify-center rounded-full ring-2 ring-white dark:ring-[#232E38]',
            theme.badge,
          )}
          style={{ width: size * 0.3, height: size * 0.3 }}
        >
          <TempIcon size={Math.max(10, size * 0.16)} strokeWidth={2.5} />
        </span>
      )}

      {online && (
        <span
          className={cn(
            'absolute bottom-0 left-0 rounded-full ring-2 ring-white',
            onlineClassName ?? 'bg-success-500',
          )}
          style={{ width: size * 0.26, height: size * 0.26 }}
        />
      )}
    </div>
  )
}
