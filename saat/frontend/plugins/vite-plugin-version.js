import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
var __dirname = dirname(fileURLToPath(import.meta.url));
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
export function versionPlugin() {
    var pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));
    var semver = pkg.version || '1.0.0';
    var buildHash = "".concat(Date.now().toString(36), "-").concat(Math.random().toString(36).slice(2, 6));
    var buildTime = new Date().toISOString();
    return {
        name: 'vite-plugin-version',
        buildStart: function () {
            var updateType = process.env.VITE_UPDATE_TYPE || 'optional';
            var versionData = {
                version: semver,
                buildHash: buildHash,
                buildTime: buildTime,
                timestamp: Date.now(),
                updateType: updateType,
                minVersion: semver,
            };
            writeFileSync(resolve(__dirname, '../public/version.json'), JSON.stringify(versionData, null, 2));
        },
        config: function () {
            return {
                define: {
                    __APP_BUILD_VERSION__: JSON.stringify(semver),
                    __APP_BUILD_HASH__: JSON.stringify(buildHash),
                    __APP_BUILD_TIME__: JSON.stringify(buildTime),
                },
            };
        },
    };
}
