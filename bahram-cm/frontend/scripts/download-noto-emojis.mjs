/**
 * Download self-hosted Noto Emoji Animation Lottie files.
 * @see https://googlefonts.github.io/noto-emoji-animation/
 * URL pattern: https://fonts.gstatic.com/s/e/notoemoji/latest/{codepoint}/lottie.json
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../assets/lottie/noto');

/** filename (without .json) → codepoint(s) joined with underscore for ZWJ sequences */
const EMOJIS = {
  smile: '1f60a',
  'slight-smile': '1f642',
  grin: '1f601',
  pray: '1f64f',
  heart: '2764',
  'thumbs-up': '1f44d',
  book: '1f4da',
  sparkles: '2728',
  'green-heart': '1f49a',
  star: '2b50',
  wave: '1f44b',
  speech: '1f4ac',
  fire: '1f525',
  clap: '1f44f',
  laugh: '1f602',
  sad: '1f622',
  party: '1f389',
  rocket: '1f680',
  eyes: '1f440',
  muscle: '1f4aa',
  hundred: '1f4af',
  wink: '1f609',
  target: '1f3af',
};

async function download(name, codepoint) {
  const url = `https://fonts.gstatic.com/s/e/notoemoji/latest/${codepoint}/lottie.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name} (${codepoint}): HTTP ${res.status}`);
  const json = await res.text();
  const dest = path.join(OUT_DIR, `${name}.json`);
  await writeFile(dest, json, 'utf8');
  console.log(`✓ ${name}.json`);
}

await mkdir(OUT_DIR, { recursive: true });

let failed = 0;
for (const [name, codepoint] of Object.entries(EMOJIS)) {
  try {
    await download(name, codepoint);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${err.message}`);
  }
}

if (failed > 0) process.exitCode = 1;
