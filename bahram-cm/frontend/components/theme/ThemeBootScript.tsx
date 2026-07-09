import { THEME_BOOT_SCRIPT } from "@/lib/theme-boot-script";

/** Runs in <head> before first paint to set data-theme and avoid flash of wrong theme. */
export function ThemeBootScript() {
  return (
    <script
      id="theme-boot"
      dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
    />
  );
}
