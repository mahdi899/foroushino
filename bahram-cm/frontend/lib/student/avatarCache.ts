export function appendAvatarCacheBuster(src: string, version?: string | number | null): string {
  if (!src || version == null || version === '') return src;
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}v=${encodeURIComponent(String(version))}`;
}

export function resolveAvatarVersion(
  profileVersion?: number | null,
  cacheBuster?: number | null,
): number | null {
  if (cacheBuster != null) return cacheBuster;
  if (profileVersion != null) return profileVersion;
  return null;
}
