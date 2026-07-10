/** Safe in-app redirect target after panel login. */
export function panelLoginRedirectTarget(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  if (
    trimmed &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('\\') &&
    !trimmed.startsWith('/panel/login') &&
    (trimmed.startsWith('/panel') || trimmed.startsWith('/mini-courses/'))
  ) {
    return trimmed;
  }

  return '/panel';
}
