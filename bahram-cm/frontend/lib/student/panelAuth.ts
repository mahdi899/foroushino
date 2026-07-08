/** Safe in-app redirect target after panel login. */
export function panelLoginRedirectTarget(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  if (
    trimmed.startsWith('/panel') &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('\\') &&
    !trimmed.startsWith('/panel/login')
  ) {
    return trimmed;
  }

  return '/panel';
}
