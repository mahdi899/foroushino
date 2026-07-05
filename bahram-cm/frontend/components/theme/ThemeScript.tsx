/**
 * Inline script that runs BEFORE first paint to set data-theme.
 * Prevents flash-of-wrong-theme on hard reload.
 */
export function ThemeScript() {
  const code = `(() => {
    try {
      var s = localStorage.getItem('bahram-theme');
      var m = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      var t = s === 'light' || s === 'dark' ? s : 'dark';
      document.documentElement.setAttribute('data-theme', t);
    } catch (_) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
