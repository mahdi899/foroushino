/** Local portrait paths under public/avatars/ */
export function avatarUrl(id: string): string {
  return `/avatars/${id}.jpg`
}

export function resolveAvatar(id: string, src?: string | null): string {
  return src || avatarUrl(id)
}
