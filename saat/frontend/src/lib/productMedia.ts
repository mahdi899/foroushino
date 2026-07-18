/** Resolve common video URLs to an embeddable iframe src. */
export function resolveVideoEmbedUrl(rawUrl: string | undefined | null): string | null {
  if (!rawUrl?.trim()) return null

  const trimmed = rawUrl.trim()

  if (trimmed.startsWith('/')) {
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(trimmed)) {
      return trimmed
    }
    return null
  }

  try {
    const url = new URL(trimmed)

    if (url.hostname.includes('youtube.com')) {
      const id = url.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    if (url.hostname === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    if (url.hostname.includes('aparat.com')) {
      const match = url.pathname.match(/\/v\/([^/]+)/)
      return match?.[1] ? `https://www.aparat.com/video/video/embed/videohash/${match[1]}/vt/frame` : null
    }

    if (url.hostname.includes('player.vimeo.com')) {
      return url.toString()
    }

    if (url.hostname.includes('vimeo.com')) {
      const id = url.pathname.replace(/^\//, '').split('/')[0]
      return id ? `https://player.vimeo.com/video/${id}` : null
    }

    return url.toString()
  } catch {
    return null
  }
}

export function isDirectVideoFile(url: string | undefined | null): boolean {
  if (!url?.trim()) return false
  return url.trim().startsWith('/') && /\.(mp4|webm|ogg)(\?|$)/i.test(url.trim())
}

export function formatProductPrice(price: number): string {
  if (price <= 0) return 'تماس بگیرید'
  return `${price.toLocaleString('fa-IR')} تومان`
}
