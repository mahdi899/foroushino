import { cn } from '@/lib/cn'
import { resolveAvatar } from '@/data/avatars'
import { initials } from '@/lib/format'

interface AvatarProps {
  id?: string
  first: string
  last: string
  src?: string | null
  size?: number
  online?: boolean
  className?: string
  ring?: boolean
}

const PALETTE = [
  ['#0d9488', '#10b981'],
  ['#6366f1', '#818cf8'],
  ['#f97316', '#fb923c'],
  ['#3b82f6', '#60a5fa'],
  ['#e11d48', '#fb7185'],
  ['#0891b2', '#22d3ee'],
]

function pickColor(seed: string): [string, string] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % PALETTE.length
  return PALETTE[Math.abs(h)] as [string, string]
}

export function Avatar({ id, first, last, src, size = 48, online, className, ring }: AvatarProps) {
  const [c1, c2] = pickColor(first + last)
  const imageSrc = id ? resolveAvatar(id, src) : src
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
        {imageSrc ? (
          <img src={imageSrc} alt="" className="w-full h-full object-cover" />
        ) : (
          initials(first, last)
        )}
      </div>
      {online && (
        <span
          className="absolute bottom-0 left-0 rounded-full bg-success-500 ring-2 ring-white"
          style={{ width: size * 0.26, height: size * 0.26 }}
        />
      )}
    </div>
  )
}
