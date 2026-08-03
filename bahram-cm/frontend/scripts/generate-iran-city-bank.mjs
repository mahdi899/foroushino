/**
 * Generates lib/iran/iranCityBank.generated.json from official Iran geo data
 * (sajaddp/list-of-cities-in-Iran — cities + counties with province_id).
 *
 * node scripts/generate-iran-city-bank.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(dirname(fileURLToPath(import.meta.url)), 'data', 'iran-geo');

const cities = JSON.parse(readFileSync(join(dataDir, 'cities.json'), 'utf8'));
const counties = JSON.parse(readFileSync(join(dataDir, 'counties.json'), 'utf8'));
const provinces = JSON.parse(readFileSync(join(dataDir, 'provinces.json'), 'utf8'));

function normalizeProvinceName(name) {
  return name.replace(/\s+/g, ' ').trim();
}

function normalizeCityName(name) {
  return name
    .replace(/[\s\u200c]*\d+$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** مناطق شهری اداری مثل اهواز1 یا کرج  2 — شهر جداگانه نیستند. */
function isAdministrativeZoneName(name) {
  return /\d+$/u.test(name.trim());
}

function shouldSkipCity(name) {
  if (!name || name.includes('-')) return true;
  if (/^\d/u.test(name)) return true;
  if (isAdministrativeZoneName(name)) return true;
  return false;
}

const provinceById = Object.fromEntries(
  provinces.map((item) => [item.province_id ?? item.id, normalizeProvinceName(item.name)]),
);

const seen = new Set();
const entries = [];

function pushRow(provinceId, rawCity) {
  const province = provinceById[provinceId];
  const city = normalizeCityName(rawCity);
  if (!province || !city || shouldSkipCity(city)) return;

  const key = `${province}\u0000${city}`;
  if (seen.has(key)) return;
  seen.add(key);

  entries.push({ province, city });
}

for (const item of cities) {
  pushRow(item.province_id, item.name);
}

for (const item of counties) {
  pushRow(item.province_id, item.name);
}

entries.sort((a, b) => {
  const byProvince = a.province.localeCompare(b.province, 'fa');
  if (byProvince !== 0) return byProvince;
  return a.city.localeCompare(b.city, 'fa');
});

const outPath = join(root, 'lib', 'iran', 'iranCityBank.generated.json');
writeFileSync(outPath, `${JSON.stringify(entries, null, 0)}\n`, 'utf8');
console.log(`Wrote ${entries.length} cities to ${outPath}`);
