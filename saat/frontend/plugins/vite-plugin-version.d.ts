import type { Plugin } from 'vite';
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
export declare function versionPlugin(): Plugin;
