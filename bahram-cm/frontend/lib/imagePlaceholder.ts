/** Tiny zinc-200 SVG used as next/image blur placeholder. */
export const GRAY_BLUR_DATA_URL =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12"><rect width="16" height="12" fill="#e4e4e7"/></svg>',
  );

/** Center icon for native `<img>` lazy placeholders in article HTML. */
export const LAZY_IMG_PLACEHOLDER_ICON =
  'url("data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="#a1a1aa" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 16l-5.5-5.5L5 20"/></svg>',
  ) +
  '")';
