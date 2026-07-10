import { useRef, useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ApiError } from '@/services/http'
import { removeAvatar, uploadAvatar } from '@/services/auth'
import { useStore } from '@/store/useStore'
import { AVATAR_ACCEPT, validateAvatarFile } from '@/lib/avatarUpload'
import { cn } from '@/lib/cn'

const usesRemoteData = import.meta.env.VITE_API_MODE === 'http'

function PremiumProfileAvatar({
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
  return (
    <div className="relative flex h-[104px] w-[104px] items-center justify-center">
      <div
        aria-hidden
        className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#FFB000]/35 via-[#3390EC]/28 to-[#8774E1]/32 blur-lg"
      />
      <div
        aria-hidden
        className="absolute inset-0 animate-[spin_12s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,#FFE08A,#FFB000,#3390EC,#5EB0FF,#8774E1,#10A37F,#FFE08A)] opacity-95"
      />
      <div className="absolute inset-[3px] rounded-full bg-background/95 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)] dark:bg-background/90" />
      <div className="relative z-[1] rounded-full p-[2px] shadow-[0_10px_28px_-8px_rgba(51,144,236,0.45)]">
        <Avatar id={id} first={first} last={last} src={src} size={92} ring={false} />
      </div>
    </div>
  )
}

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

  const handleRemove = async () => {
    if (uploading || !src) return

    setUploading(true)
    try {
      if (usesRemoteData) {
        const user = await removeAvatar()
        setAgentAvatar(user.avatar)
      } else {
        setAgentAvatar(null)
      }
      pushToast('عکس پروفایل حذف شد', 'info')
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'حذف عکس ناموفق بود'
      pushToast(message, 'error')
    } finally {
      setUploading(false)
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
        <PremiumProfileAvatar id={id} first={first} last={last} src={src} />
        <span className="absolute -bottom-0.5 -left-0.5 z-[2] flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#3390EC] to-[#8774E1] shadow-[0_4px_12px_-2px_rgba(51,144,236,0.55)] ring-2 ring-white dark:ring-neutral-900">
          {uploading ? (
            <Loader2 size={14} className="animate-spin text-white" />
          ) : (
            <Camera size={14} strokeWidth={2.5} className="text-white" />
          )}
        </span>
      </button>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={pickFile}
          disabled={uploading}
          className="rounded-full bg-[#3390EC]/10 px-3 py-1.5 text-[12px] font-bold text-[#3390EC] transition-colors active:bg-[#3390EC]/18 dark:bg-[#8774E1]/14 dark:text-[#8774E1]"
        >
          انتخاب عکس
        </button>
        {src && (
          <button
            type="button"
            onClick={() => void handleRemove()}
            disabled={uploading}
            className="inline-flex items-center gap-1 rounded-full bg-error-500/10 px-3 py-1.5 text-[12px] font-bold text-error-600 transition-colors active:bg-error-500/16"
          >
            <Trash2 size={13} strokeWidth={2.25} />
            حذف
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] font-medium text-[#8E8E93] dark:text-[#98989D]">
        JPG، PNG یا WebP — حداکثر ۲ مگابایت
      </p>
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
