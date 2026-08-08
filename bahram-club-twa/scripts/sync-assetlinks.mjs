#!/usr/bin/env node
/**
 * Sync TWA SHA-256 fingerprints into frontend/data/twa-asset-links.json
 * after `bubblewrap fingerprint add` or keystore generation.
 *
 * Usage:
 *   node scripts/sync-assetlinks.mjs
 *   node scripts/sync-assetlinks.mjs --fingerprint AA:BB:...
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const twaManifestPath = join(root, 'twa-manifest.json');
const assetLinksPath = join(root, '..', 'bahram-cm', 'frontend', 'data', 'twa-asset-links.json');

function parseArgs(argv) {
  const fingerprints = [];
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--fingerprint' && argv[i + 1]) {
      fingerprints.push(argv[i + 1].trim().toUpperCase());
      i += 1;
    }
  }
  return fingerprints;
}

const cliFingerprints = parseArgs(process.argv);
const twaManifest = JSON.parse(readFileSync(twaManifestPath, 'utf8'));
const manifestFingerprints = Array.isArray(twaManifest.fingerprints)
  ? twaManifest.fingerprints
      .map((entry) => (typeof entry === 'string' ? entry : entry?.value))
      .filter(Boolean)
      .map((value) => String(value).trim().toUpperCase())
  : [];

const merged = [...new Set([...cliFingerprints, ...manifestFingerprints])];

const payload = {
  packageId: twaManifest.packageId || 'club.rostami.family',
  fingerprints: merged,
};

writeFileSync(assetLinksPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Updated ${assetLinksPath}`);
console.log(`Fingerprints (${merged.length}):`, merged.length ? merged.join(', ') : '(none — run init-keystore.ps1 first)');
