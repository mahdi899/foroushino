/** Canonical PWA icon set — 192/512 satisfy Chrome install criteria. */
export const PWA_MANIFEST_ICONS = [
  { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
  { src: '/pwa/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/pwa/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/pwa/icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
] as const;
