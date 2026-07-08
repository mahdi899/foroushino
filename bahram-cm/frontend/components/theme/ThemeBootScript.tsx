import Script from "next/script";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-boot-script";

/** Runs before hydration to set data-theme and avoid flash of wrong theme. */
export function ThemeBootScript() {
  return (
    <Script
      id="theme-boot"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
    />
  );
}
