import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { resolveAvatar } from '@/data/avatars'
import { avatarGradients } from '@/lib/colors'
import { initials } from '@/lib/format'

interface AvatarProps {
  id?: string
  first: string
  last: string
  src?: string | null
  size?: number
  online?: boolean
  onlineClassName?: string
  gradient?: [string, string]
  className?: string
  ring?: boolean
}

const PALETTE = avatarGradients

function pickColor(seed: string): [string, string] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % PALETTE.length
  return PALETTE[Math.abs(h)] as [string, string]
}

export function Avatar({
  id,
  first,
  last,
  src,
  size = 48,
  online,
  onlineClassName,
  gradient,
  className,
  ring,
}: AvatarProps) {
  const [c1, c2] = gradient ?? pickColor(first + last)
  const imageSrc = id ? resolveAvatar(id, src) : src ?? null
  const [imgFailed, setImgFailed] = useState(false)
  const showPhoto = imageSrc && !imgFailed

  useEffect(() => {
    setImgFailed(false)
  }, [imageSrc, id])

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={cn(
          'w-full h-full rounded-full flex items-center justify-center font-extrabold text-white overflow-hidden',
          ring && 'ring-2 ring-white shadow-soft',
          className,
        )}
        style={{
          background: `linear-gradient(135deg, ${c1}, ${c2})`,
          fontSize: size * 0.36,
        }}
      >
        {showPhoto ? (
          <img
            src={imageSrc}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          initials(first, last)
        )}
      </div>
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
