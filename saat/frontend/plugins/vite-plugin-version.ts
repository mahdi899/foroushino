import type { Plugin } from 'vite'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * version.json schema served at /version.json
 *
 * updateType controls how the frontend treats this release:
 *   "forced"   → full-screen blocker, user MUST update (breaking changes)
 *   "optional" → bottom popup, user can dismiss (normal releases)
 *   "silent"   → no UI, SW updates caches in background (hotfixes, typos)
 *
 * Set via env: VITE_UPDATE_TYPE=forced|optional|silent  (default: optional)
 */
export function versionPlugin(): Plugin {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'))
  const semver: string = pkg.version || '1.0.0'

  const buildHash = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const buildTime = new Date().toISOString()

  return {
    name: 'vite-plugin-version',

    buildStart() {
      const updateType = process.env.VITE_UPDATE_TYPE || 'optional'

      const versionData = {
        version: semver,
        buildHash,
        buildTime,
        timestamp: Date.now(),
        updateType,
        minVersion: semver,
      }

      writeFileSync(
        resolve(__dirname, '../public/version.json'),
        JSON.stringify(versionData, null, 2),
      )
    },

    config() {
      return {
        define: {
          __APP_BUILD_VERSION__: JSON.stringify(semver),
          __APP_BUILD_HASH__: JSON.stringify(buildHash),
          __APP_BUILD_TIME__: JSON.stringify(buildTime),
        },
      }
    },
  }
}
