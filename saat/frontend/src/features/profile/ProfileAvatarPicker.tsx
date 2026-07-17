import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Loader2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { TopPerformerAvatarRing } from '@/components/ui/TopPerformerAvatarRing'
import type { DailyTopRank } from '@/lib/dailyTopPerformers'
import { ApiError } from '@/services/http'
import { uploadAvatar } from '@/services/auth'
import { useStore } from '@/store/useStore'
import { AVATAR_ACCEPT, validateAvatarFile } from '@/lib/avatarUpload'
import { toFa } from '@/lib/format'
import { cn } from '@/lib/cn'

const usesRemoteData = import.meta.env.VITE_API_MODE === 'http'

export function ProfileAvatarPicker({
  id,
  first,
  last,
  src,
  dailyTopRank = null,
}: {
  id: string
  first: string
  last: string
  src?: string | null
  dailyTopRank?: DailyTopRank | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const setAgentAvatar = useStore((s) => s.setAgentAvatar)
  const pushToast = useStore((s) => s.pushToast)

  const pickFile = () => {
    if (uploading) return
    inputRef.current?.click()
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return

    const validationError = validateAvatarFile(file)
    if (validationError) {
      pushToast(validationError, 'error')
      return
    }

    setUploading(true)
    try {
      if (usesRemoteData) {
        const user = await uploadAvatar(file)
        setAgentAvatar(user.avatar)
      } else {
        const dataUrl = await readFileAsDataUrl(file)
        setAgentAvatar(dataUrl)
      }
      pushToast('عکس پروفایل ذخیره شد')
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'آپلود عکس ناموفق بود'
      pushToast(message, 'error')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const avatarNode = (
    <Avatar id={id} first={first} last={last} src={src} size={88} ring={false} />
  )

  return (
    <div className="relative flex flex-col items-center">
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      <button
        type="button"
        onClick={pickFile}
        disabled={uploading}
        aria-label="تغییر عکس پروفایل"
        className={cn(
          'group relative rounded-full transition-transform active:scale-[0.98]',
          uploading && 'pointer-events-none opacity-80',
        )}
      >
        <div className="relative">
          {dailyTopRank ? (
            <TopPerformerAvatarRing rank={dailyTopRank} variant="profile" showBadge={false}>
              {avatarNode}
            </TopPerformerAvatarRing>
          ) : (
            <>
              <div
                aria-hidden
                className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-[#3390EC]/30 to-[#8774E1]/25 blur-sm"
              />
              <div className="relative rounded-full p-[2px] ring-1 ring-white/60 dark:ring-white/15">
                {avatarNode}
              </div>
            </>
          )}
          <span className="absolute -bottom-0.5 -left-0.5 z-[2] flex h-7 w-7 items-center justify-center rounded-full bg-[#3390EC] shadow-md ring-2 ring-background dark:bg-[#8774E1]">
            {uploading ? (
              <Loader2 size={14} className="animate-spin text-white" />
            ) : (
              <Camera size={14} strokeWidth={2.5} className="text-white" />
            )}
          </span>
        </div>
      </button>

      {dailyTopRank ? (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold shadow-sm',
            dailyTopRank === 1 && 'bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950',
            dailyTopRank === 2 && 'bg-gradient-to-r from-slate-400 to-slate-200 text-slate-900',
            dailyTopRank === 3 && 'bg-gradient-to-r from-orange-500 to-amber-400 text-orange-950',
          )}
        >
          برتر امروز · رتبه {toFa(dailyTopRank)}
        </motion.span>
      ) : (
        <p className="mt-2 text-[11px] font-semibold text-text-soft">برای تغییر عکس ضربه بزن</p>
      )}
    </div>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('خواندن فایل ناموفق بود'))
    reader.readAsDataURL(file)
  })
}
