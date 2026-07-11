#!/usr/bin/env node
/**
 * Import path consistency checker.
 *
 * Verifies that every local import (`@/...` alias or relative `./`/`../`)
 * resolves to a file that exists ON DISK WITH THE EXACT SAME CASING.
 *
 * Case-insensitive filesystems (Windows, default macOS) happily resolve
 * `@/components/ui/button` even when the file is `Button.tsx`. Linux CI does
 * not — and the build fails. This script catches those mismatches locally and
 * in CI before they reach Linux.
 *
 * Usage: node scripts/check-imports.mjs
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SCAN_DIRS = ["app", "components", "lib", "content"];
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);
const RESOLVE_EXT = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".d.ts"];
const INDEX_FILES = ["index.ts", "index.tsx", "index.js", "index.jsx"];

const IMPORT_RE =
  /(?:import|export)[\s\S]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

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

/** Returns true if `target` exists and every path segment matches on-disk casing. */
async function existsCaseSensitive(target) {
  try {
    await stat(target);
  } catch {
    return false;
  }
  const rel = path.relative(ROOT, target);
  if (rel.startsWith("..")) return true; // outside root: skip casing check
  const segments = rel.split(path.sep).filter(Boolean);
  let current = ROOT;
  for (const segment of segments) {
    let listing;
    try {
      listing = await readdir(current);
    } catch {
      return false;
    }
    if (!listing.includes(segment)) return false;
    current = path.join(current, segment);
  }
  return true;
}

async function resolveLocal(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) {
    base = path.join(ROOT, spec.slice(2));
  } else if (spec.startsWith("./") || spec.startsWith("../")) {
    base = path.resolve(path.dirname(fromFile), spec);
  } else {
    return { local: false };
  }

  for (const ext of RESOLVE_EXT) {
    const candidate = base + ext;
    if (await existsCaseSensitive(candidate)) return { local: true, ok: true };
  }
  for (const index of INDEX_FILES) {
    const candidate = path.join(base, index);
    if (await existsCaseSensitive(candidate)) return { local: true, ok: true };
  }
  return { local: true, ok: false };
}

async function main() {
  const problems = [];
  for (const dirName of SCAN_DIRS) {
    for await (const file of walk(path.join(ROOT, dirName))) {
      if (!CODE_EXT.has(path.extname(file))) continue;
      const text = await readFile(file, "utf8");
      let m;
      while ((m = IMPORT_RE.exec(text)) !== null) {
        const spec = m[1] ?? m[2];
        if (!spec) continue;
        const res = await resolveLocal(spec, file);
        if (res.local && !res.ok) {
          problems.push({ file: path.relative(ROOT, file), spec });
        }
      }
    }
  }

  if (problems.length === 0) {
    console.log("OK: all local imports resolve with correct casing.");
    return;
  }

  console.error(`\nFAILED: ${problems.length} import(s) do not resolve (case-sensitive):\n`);
  for (const p of problems) {
    console.error(`  - ${p.spec}`);
    console.error(`      in ${p.file}`);
  }
  console.error("");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
