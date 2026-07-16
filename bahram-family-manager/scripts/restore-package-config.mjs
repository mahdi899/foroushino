#!/usr/bin/env node
/**
 * Rebuild .dart_tool/package_config.json from pubspec.lock + local pub cache
 * when `flutter pub get` fails (e.g. bad pub credentials / advisories 403).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const lockPath = path.join(projectRoot, 'pubspec.lock');
const dartTool = path.join(projectRoot, '.dart_tool');
const pubCache = path.join(
  process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Local'),
  'Pub',
  'Cache',
  'hosted',
  'pub.dev',
);
const flutterRoot = path.resolve(projectRoot, '..', '.tools', 'flutter');

function toFileUri(absPath) {
  const normalized = absPath.replace(/\\/g, '/');
  return `file:///${normalized.startsWith('/') ? normalized.slice(1) : normalized}`;
}

function sdkRootUri(name) {
  const map = {
    flutter: path.join(flutterRoot, 'packages', 'flutter'),
    flutter_localizations: path.join(flutterRoot, 'packages', 'flutter_localizations'),
    flutter_test: path.join(flutterRoot, 'packages', 'flutter_test'),
    flutter_web_plugins: path.join(flutterRoot, 'packages', 'flutter_web_plugins'),
    sky_engine: path.join(flutterRoot, 'bin', 'cache', 'pkg', 'sky_engine'),
  };
  const resolved = map[name] ?? path.join(flutterRoot, 'bin', 'cache', 'dart-sdk', 'lib', name);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Missing SDK package path: ${resolved}`);
  }
  return toFileUri(resolved);
}

function parseLockfile(text) {
  const packages = [];
  let current = null;
  let source = null;
  let version = null;

  for (const line of text.split(/\r?\n/)) {
    const nameMatch = line.match(/^  ([a-zA-Z0-9_]+):$/);
    if (nameMatch) {
      current = nameMatch[1];
      source = null;
      version = null;
      continue;
    }
    if (!current) continue;
    const sourceMatch = line.match(/^    source: (.+)$/);
    if (sourceMatch) {
      source = sourceMatch[1].replace(/"/g, '');
      continue;
    }
    const versionMatch = line.match(/^    version: "(.+)"$/);
    if (versionMatch) {
      version = versionMatch[1];
      packages.push({ name: current, source, version });
      current = null;
      source = null;
      version = null;
    }
  }
  return packages;
}

const lockText = fs.readFileSync(lockPath, 'utf8');
const parsed = parseLockfile(lockText);
const packages = [];

for (const pkg of parsed) {
  let rootUri;
  if (pkg.source === 'sdk') {
    rootUri = sdkRootUri(pkg.name);
  } else {
    const dir = path.join(pubCache, `${pkg.name}-${pkg.version}`);
    if (!fs.existsSync(dir)) {
      console.error(`Missing pub cache folder: ${dir}`);
      process.exit(1);
    }
    rootUri = toFileUri(dir);
  }
  packages.push({
    name: pkg.name,
    rootUri,
    packageUri: 'lib/',
    languageVersion: '3.3',
  });
}

packages.push({
  name: 'bahram_family_manager',
  rootUri: '../',
  packageUri: 'lib/',
  languageVersion: '3.3',
});

fs.mkdirSync(dartTool, { recursive: true });
const config = {
  configVersion: 2,
  packages,
  generated: new Date().toISOString(),
  generator: 'pub',
  generatorVersion: '3.6.0',
};
fs.writeFileSync(path.join(dartTool, 'package_config.json'), `${JSON.stringify(config, null, 2)}\n`);
console.log(`Wrote package_config.json (${packages.length} packages)`);
