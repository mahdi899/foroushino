import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ApiError } from '@/services/http'
import { uploadAvatar } from '@/services/auth'
import { useStore } from '@/store/useStore'
import { AVATAR_ACCEPT, validateAvatarFile } from '@/lib/avatarUpload'
import { cn } from '@/lib/cn'

const usesRemoteData = import.meta.env.VITE_API_MODE === 'http'

export function ProfileAvatarPicker({
  id,
  first,
  last,
  src,
}: {
  id: string
  first: string
  last: string
  src?: string | null
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
          <div
            aria-hidden
            className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-[#3390EC]/30 to-[#8774E1]/25 blur-sm"
          />
          <div className="relative rounded-full p-[2px] ring-1 ring-white/60 dark:ring-white/15">
            <Avatar id={id} first={first} last={last} src={src} size={88} ring={false} />
          </div>
          <span className="absolute -bottom-0.5 -left-0.5 z-[2] flex h-7 w-7 items-center justify-center rounded-full bg-[#3390EC] shadow-md ring-2 ring-background dark:bg-[#8774E1]">
            {uploading ? (
              <Loader2 size={14} className="animate-spin text-white" />
            ) : (
              <Camera size={14} strokeWidth={2.5} className="text-white" />
            )}
          </span>
        </div>
      </button>

      <p className="mt-2 text-[11px] font-semibold text-text-soft">برای تغییر عکس ضربه بزن</p>
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
