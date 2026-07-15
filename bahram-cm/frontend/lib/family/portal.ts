/** Portal mount inside family theme scope so CSS variables resolve. */
export function getFamilyPortalRoot(): HTMLElement {
  if (typeof document === 'undefined') return null as unknown as HTMLElement;
  return document.getElementById('family-root') ?? document.body;
}
