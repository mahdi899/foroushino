export interface LinkRelFlags {
  nofollow: boolean;
  sponsored: boolean;
}

export interface LinkEditorValues extends LinkRelFlags {
  href: string;
  openInNewTab: boolean;
}

export function parseLinkRel(rel: string | null | undefined): LinkRelFlags {
  const tokens = (rel ?? '').split(/\s+/).filter(Boolean);
  return {
    nofollow: tokens.includes('nofollow'),
    sponsored: tokens.includes('sponsored'),
  };
}

/** Build rel attribute from editor toggles (includes noopener/noreferrer for new tabs). */
export function buildLinkRel({ openInNewTab, nofollow, sponsored }: LinkEditorValues): string | null {
  const parts: string[] = [];
  if (openInNewTab) {
    parts.push('noopener', 'noreferrer');
  }
  if (nofollow) parts.push('nofollow');
  if (sponsored) parts.push('sponsored');
  return parts.length > 0 ? parts.join(' ') : null;
}

export function linkAttrsFromEditor(values: LinkEditorValues) {
  return {
    href: values.href.trim(),
    target: values.openInNewTab ? '_blank' : null,
    rel: buildLinkRel(values),
    class: 'text-accent underline',
  };
}
