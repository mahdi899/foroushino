/** Mask admin email for display. */
export function maskAdminEmail(email: string | null | undefined): string {
  const trimmed = (email ?? '').trim();
  if (!trimmed) return '—';

  const at = trimmed.indexOf('@');
  if (at <= 0) return '***';

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const maskedLocal = local.length <= 1 ? '*' : `${local[0]}***`;

  const dot = domain.lastIndexOf('.');
  if (dot <= 0) {
    return `${maskedLocal}@${domain[0] ?? '*'}***`;
  }

  const domainName = domain.slice(0, dot);
  const tld = domain.slice(dot);
  const maskedDomain = domainName.length <= 2 ? `${domainName[0] ?? '*'}***` : `${domainName.slice(0, 2)}***`;

  return `${maskedLocal}@${maskedDomain}${tld}`;
}

/** Full email only when the viewer is super-admin (مدیر کل). */
export function displayAdminEmail(email: string | null | undefined, viewerIsSuperAdmin: boolean): string {
  if (!email) return '—';
  if (viewerIsSuperAdmin) return email;
  return maskAdminEmail(email);
}
