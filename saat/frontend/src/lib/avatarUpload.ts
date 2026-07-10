export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
export const AVATAR_ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const AVATAR_ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])

export function validateAvatarFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (!AVATAR_ALLOWED_MIME_TYPES.has(file.type) && !AVATAR_ALLOWED_EXTENSIONS.has(extension)) {
    return 'فرمت مجاز: JPG، PNG یا WebP.'
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return 'حداکثر حجم عکس ۲ مگابایت است.'
  }

  return null
}
