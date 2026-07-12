const DEFAULT_LINK_LABEL = 'مشاهده';

export function isExternalNotificationLink(link: string): boolean {
  return /^https?:\/\//i.test(link.trim());
}

export function resolveNotificationLinkLabel(link: string | null | undefined, linkLabel?: string | null): string | null {
  if (!link?.trim()) {
    return null;
  }

  const trimmedLabel = linkLabel?.trim();
  return trimmedLabel || DEFAULT_LINK_LABEL;
}
