const IDENTITY_FOCUS_PATH = '/panel/identity-verification';

export function isPanelIdentityFocusPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === IDENTITY_FOCUS_PATH || pathname.startsWith(`${IDENTITY_FOCUS_PATH}/`);
}
