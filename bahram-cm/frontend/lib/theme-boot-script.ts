/** Inline theme boot — must run in <head> before first paint. */
export const THEME_BOOT_SCRIPT = `(() => {
  try {
    var s = localStorage.getItem('bahram-theme');
    var t = s === 'light' || s === 'dark' ? s : 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();`;
