"use client";

import { useServerInsertedHTML } from "next/navigation";

const THEME_BOOT_SCRIPT = `(() => {
  try {
    var s = localStorage.getItem('bahram-theme');
    var t = s === 'light' || s === 'dark' ? s : 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();`;

/** Runs before paint via server HTML injection — avoids React 19 script-in-tree warnings. */
export function ThemeBootScript() {
  useServerInsertedHTML(() => (
    <script id="theme-boot" dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
  ));

  return null;
}
