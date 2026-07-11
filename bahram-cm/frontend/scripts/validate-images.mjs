#!/usr/bin/env node
/**
 * Image reference validator.
 *
 * Scans the source tree for local image references and asserts files exist on disk.
 * Resolves legacy /media/* paths via legacyMap → backend storage.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const STORAGE_DIR = path.resolve(ROOT, "..", "backend", "storage", "app", "public");
const LEGACY_MAP_FILE = path.join(ROOT, "lib", "media", "legacyMap.generated.ts");

const SCAN_DIRS = ["app", "components", "lib", "content"];
const SKIP_FILES = new Set(["lib/media/legacyMap.generated.ts"]);
const SCAN_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mdx", ".md"]);
const IMAGE_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg", ".gif", ".ico",
]);

const REF_RE = /["'`](\/(?:media|storage|lottie|fonts|images|assets)\/[^"'`]+?\.[a-zA-Z0-9]+)["'`]/g;

function stripBlockComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "");
}

async function* walk(dir) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

async function existsCaseSensitive(baseDir, relPath) {
  const absPath = path.join(baseDir, relPath);
  try {
    await stat(absPath);
  } catch {
    return false;
  }
  const segments = relPath.split(path.sep).filter(Boolean);
  let current = baseDir;
  for (const segment of segments) {
    const listing = await readdir(current);
    if (!listing.includes(segment)) return false;
    current = path.join(current, segment);
  }
  return true;
}

async function loadLegacyMap() {
  const map = new Map();
  try {
    const text = await readFile(LEGACY_MAP_FILE, "utf8");
    const re = /"(\/media\/[^"]+)":\s*"(\/storage\/[^"]+)"/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      map.set(m[1], m[2]);
    }
  } catch {
    /* no legacy map */
  }
  return map;
}

function resolveRef(ref, legacyMap) {
  return legacyMap.get(ref) ?? ref;
}

async function existsAsset(ref, legacyMap) {
  const resolved = resolveRef(ref, legacyMap);
  if (resolved.startsWith("/storage/")) {
    const rel = resolved.replace(/^\/storage\//, "").split("/").join(path.sep);
    try {
      await stat(path.join(STORAGE_DIR, rel));
      return true;
    } catch {
      return false;
    }
  }
  return existsCaseSensitive(PUBLIC_DIR, resolved.replace(/^\//, "").split("/").join(path.sep));
}

async function main() {
  const legacyMap = await loadLegacyMap();
  const refs = new Map();

  for (const dirName of SCAN_DIRS) {
    const dir = path.join(ROOT, dirName);
    for await (const file of walk(dir)) {
      const relFile = path.relative(ROOT, file).replace(/\\/g, "/");
      if (SKIP_FILES.has(relFile)) continue;
      const ext = path.extname(file);
      if (!SCAN_EXT.has(ext)) continue;
      let text = await readFile(file, "utf8");
      if (ext === ".ts" || ext === ".tsx" || ext === ".js" || ext === ".jsx") {
        text = stripBlockComments(text);
      }
      let m;
      while ((m = REF_RE.exec(text)) !== null) {
        const ref = m[1];
        if (!IMAGE_EXT.has(path.extname(ref))) continue;
        if (!refs.has(ref)) refs.set(ref, new Set());
        refs.get(ref).add(path.relative(ROOT, file));
      }
    }
  }

  const missing = [];
  const checked = new Set();
  for (const [ref, sources] of refs) {
    const resolved = resolveRef(ref, legacyMap);
    const key = resolved.startsWith("/storage/") ? resolved : ref;
    if (checked.has(key)) continue;
    checked.add(key);
    if (!(await existsAsset(ref, legacyMap))) {
      missing.push({ ref, resolved, sources: [...sources] });
    }
  }

  const total = refs.size;
  if (missing.length === 0) {
    console.log(`OK: all ${total} referenced image assets exist (case-sensitive).`);
    return;
  }

  console.error(`\nFAILED: ${missing.length}/${total} referenced image(s) missing:\n`);
  for (const { ref, resolved, sources } of missing) {
    console.error(`  - ${ref}${resolved !== ref ? ` → ${resolved}` : ""}`);
    for (const s of sources) console.error(`      referenced in ${s}`);
  }
  console.error("");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
