/** Portrait pool size — files live in `public/avatars/ir-01.jpg` … `ir-NN.jpg` */
export const AVATAR_POOL_SIZE = 48

/** Stable pool key for any user/lead id (mock string ids or API numeric ids). */
export function avatarPoolSlug(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  const index = (Math.abs(h) % AVATAR_POOL_SIZE) + 1
  return `ir-${String(index).padStart(2, '0')}`
}

export function avatarUrl(id: string): string {
  return `/avatars/${avatarPoolSlug(id)}.jpg`
}

export function resolveAvatar(id: string, src?: string | null): string | null {
  if (src) return src
  if (id) return avatarUrl(id)
  return null
}
