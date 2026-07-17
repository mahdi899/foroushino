const THEME_KEY_PREFIX = 'saat-theme:'

/** Apply light/dark theme to the document root (Tailwind uses `[data-theme="dark"]`). */
export function applyTheme(darkMode: boolean): void {
  const theme = darkMode ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', darkMode ? '#070C0E' : '#006F75')
}

export function themeStorageKey(userId: string): string {
  return `${THEME_KEY_PREFIX}${userId}`
}

export function readUserThemePreference(userId: string): boolean | null {
  try {
    const raw = localStorage.getItem(themeStorageKey(userId))
    if (raw === null) return null
    return raw === 'dark'
  } catch {
    return null
  }
}

export function writeUserThemePreference(userId: string, darkMode: boolean): void {
  try {
    localStorage.setItem(themeStorageKey(userId), darkMode ? 'dark' : 'light')
  } catch {
    /* ignore quota / private mode */
  }
}

export function resolveUserTheme(userId: string | null | undefined, fallback = false): boolean {
  if (!userId) return fallback
  return readUserThemePreference(userId) ?? fallback
}

/** One-time migration from legacy global `darkMode` in saat-store. */
export function migrateLegacyThemePreference(userId: string): boolean | null {
  if (readUserThemePreference(userId) !== null) return null

  try {
    const raw = localStorage.getItem('saat-store')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: { darkMode?: boolean } }
    if (typeof parsed.state?.darkMode === 'boolean') {
      writeUserThemePreference(userId, parsed.state.darkMode)
      return parsed.state.darkMode
    }
  } catch {
    /* ignore */
  }

  return null
}

/** Bootstrap script helper — read persisted theme before React hydrates. */
export function readBootstrapTheme(): boolean {
  try {
    const raw = localStorage.getItem('saat-store')
    if (!raw) return false
    const parsed = JSON.parse(raw) as { state?: { isAuthed?: boolean; currentAgentId?: string } }
    const userId = parsed.state?.isAuthed ? parsed.state.currentAgentId : null
    if (!userId) return false
    migrateLegacyThemePreference(userId)
    return resolveUserTheme(userId, false)
  } catch {
    return false
  }
}
