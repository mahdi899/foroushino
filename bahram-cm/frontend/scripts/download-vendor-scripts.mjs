/**
 * Download third-party scripts for self-hosting on bahram/family sites.
 * Run: node scripts/download-vendor-scripts.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, '..', 'public', 'vendor');

const ASSETS = [
  {
    dir: 'plausible',
    file: 'script.js',
    url: 'https://plausible.io/js/script.js',
  },
];

async function downloadAsset({ dir, file, url }) {
  const targetDir = path.join(publicDir, dir);
  await mkdir(targetDir, { recursive: true });
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  const body = await res.text();
  const target = path.join(targetDir, file);
  await writeFile(target, body, 'utf8');
  console.log(`saved ${path.relative(publicDir, target)} (${body.length} bytes)`);
}

for (const asset of ASSETS) {
  await downloadAsset(asset);
}

console.log('vendor scripts ready');
