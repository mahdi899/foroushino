#!/usr/bin/env node
/**
 * Image reference validator.
 *
 * Scans the source tree for local image references (any string that points at a
 * file under `public/`, e.g. "/media/...") and asserts that the file actually
 * exists on disk. This prevents 404 images and, critically, catches
 * case-sensitivity mismatches that pass on Windows/macOS but break on Linux.
 *
 * Usage: node scripts/validate-images.mjs
 * Exits non-zero if any referenced asset is missing.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const SCAN_DIRS = ["app", "components", "lib", "content"];
const SCAN_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mdx", ".md"]);
const IMAGE_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg", ".gif", ".ico",
]);

// Matches quoted strings that look like a public asset path: "/media/x.jpg"
const REF_RE = /["'`](\/(?:media|lottie|fonts|images|assets)\/[^"'`]+?\.[a-zA-Z0-9]+)["'`]/g;

/** Strip /* *​/ block comments from code files so example paths in JSDoc are ignored. */
function stripBlockComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Recursively walk a directory, yielding file paths. */
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

/** Case-sensitive existence check (so Linux build failures are caught early). */
async function existsCaseSensitive(absPath) {
  try {
    await stat(absPath);
  } catch {
    return false;
  }
  // Verify each path segment matches the real on-disk casing.
  const rel = path.relative(PUBLIC_DIR, absPath);
  const segments = rel.split(path.sep);
  let current = PUBLIC_DIR;
  for (const segment of segments) {
    const listing = await readdir(current);
    if (!listing.includes(segment)) return false;
    current = path.join(current, segment);
  }
  return true;
}

async function main() {
  const refs = new Map(); // ref -> Set(sourceFiles)

  for (const dirName of SCAN_DIRS) {
    const dir = path.join(ROOT, dirName);
    for await (const file of walk(dir)) {
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
  for (const [ref, sources] of refs) {
    const abs = path.join(PUBLIC_DIR, ref.replace(/^\//, ""));
    if (!(await existsCaseSensitive(abs))) {
      missing.push({ ref, sources: [...sources] });
    }
  }

  const total = refs.size;
  if (missing.length === 0) {
    console.log(`OK: all ${total} referenced image assets exist (case-sensitive).`);
    return;
  }

  console.error(`\nFAILED: ${missing.length}/${total} referenced image(s) missing:\n`);
  for (const { ref, sources } of missing) {
    console.error(`  - ${ref}`);
    for (const s of sources) console.error(`      referenced in ${s}`);
  }
  console.error("");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
