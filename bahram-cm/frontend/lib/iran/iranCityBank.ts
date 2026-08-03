import generatedCities from '@/lib/iran/iranCityBank.generated.json';

export type IranCityEntry = {
  province: string;
  city: string;
};

export type IranCitySuggestion = IranCityEntry & {
  label: string;
};

/** روستاها و محلات پرکاربرد که در فهرست رسمی شهر/شهرستان نیستند. */
const IRAN_CITY_SUPPLEMENT: readonly IranCityEntry[] = [
  { province: 'مرکزی', city: 'سیاوش' },
  { province: 'مرکزی', city: 'غرق‌آباد' },
  { province: 'مرکزی', city: 'نوبران' },
  { province: 'تهران', city: 'پونک' },
  { province: 'تهران', city: 'نارمک' },
  { province: 'تهران', city: 'تجریش' },
];

function formatLabel(entry: IranCityEntry): string {
  return `${entry.province} - ${entry.city}`;
}

const IRAN_CITY_BANK: IranCitySuggestion[] = (() => {
  const seen = new Set<string>();
  const rows: IranCitySuggestion[] = [];

  const push = (entry: IranCityEntry) => {
    const province = entry.province.trim();
    const city = entry.city.trim();
    if (!province || !city) return;

    const key = `${province}\u0000${city}`;
    if (seen.has(key)) return;
    seen.add(key);

    rows.push({ province, city, label: formatLabel({ province, city }) });
  };

  for (const entry of generatedCities as IranCityEntry[]) {
    push(entry);
  }
  for (const entry of IRAN_CITY_SUPPLEMENT) {
    push(entry);
  }

  return rows;
})();

/** @deprecated از IRAN_CITY_BANK استفاده کنید */
export const IRAN_CITIES: string[] = [...new Set(IRAN_CITY_BANK.map((item) => item.city))].sort((a, b) =>
  a.localeCompare(b, 'fa'),
);

export function formatIranCityLabel(entry: IranCityEntry): string {
  return formatLabel(entry);
}

export const IRAN_CITY_SEARCH_MIN_LENGTH = 3;

function normalizeFa(value: string): string {
  return value
    .trim()
    .replace(/\u200c/g, '')
    .replace(/[يی]/g, 'ی')
    .replace(/[كک]/g, 'ک')
    .replace(/[أإآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ');
}

function compactFa(value: string): string {
  return normalizeFa(value).replace(/\s+/g, '');
}

function scoreSuggestion(entry: IranCitySuggestion, query: string): number {
  const q = normalizeFa(query);
  const qCompact = compactFa(query);
  if (!q) return 0;

  const city = normalizeFa(entry.city);
  const province = normalizeFa(entry.province);
  const label = normalizeFa(entry.label);
  const cityCompact = compactFa(entry.city);
  const labelCompact = compactFa(entry.label);

  if (city === q || label === q || cityCompact === qCompact || labelCompact === qCompact) return 100;
  if (city.startsWith(q) || cityCompact.startsWith(qCompact)) return 90;
  if (label.startsWith(q) || labelCompact.startsWith(qCompact)) return 85;
  if (province.startsWith(q) && (city.includes(q) || cityCompact.includes(qCompact))) return 80;
  if (city.includes(q) || cityCompact.includes(qCompact)) return 70;
  if (province.includes(q)) return 60;
  if (label.includes(q) || labelCompact.includes(qCompact)) return 55;

  const parts = q.split(/[\s\-–—]+/).filter(Boolean);
  if (parts.length > 1) {
    const allMatch = parts.every(
      (part) => city.includes(part) || province.includes(part) || cityCompact.includes(compactFa(part)),
    );
    if (allMatch) return 65;
  }

  return 0;
}

export function searchIranCitySuggestions(query: string, limit = 10): IranCitySuggestion[] {
  const q = query.trim();
  if (q.length < IRAN_CITY_SEARCH_MIN_LENGTH) return [];

  return IRAN_CITY_BANK.filter((entry) => scoreSuggestion(entry, q) > 0)
    .sort((a, b) => {
      const diff = scoreSuggestion(b, q) - scoreSuggestion(a, q);
      if (diff !== 0) return diff;
      return a.label.localeCompare(b.label, 'fa');
    })
    .slice(0, limit);
}

export function findIranCitySuggestion(value: string): IranCitySuggestion | null {
  const normalized = normalizeFa(value);
  const compact = compactFa(value);
  if (!normalized) return null;

  return (
    IRAN_CITY_BANK.find((entry) => {
      const city = normalizeFa(entry.city);
      const label = normalizeFa(entry.label);
      return (
        label === normalized ||
        city === normalized ||
        compactFa(entry.label) === compact ||
        compactFa(entry.city) === compact ||
        normalizeFa(`${entry.province} ${entry.city}`) === normalized
      );
    }) ?? null
  );
}

export function completeIranCityInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.length < IRAN_CITY_SEARCH_MIN_LENGTH) return trimmed;

  const exact = findIranCitySuggestion(trimmed);
  if (exact) return exact.label;

  const [best] = searchIranCitySuggestions(trimmed, 1);
  if (!best) return trimmed;

  const q = compactFa(trimmed);
  const city = compactFa(best.city);
  if (city === q || city.startsWith(q)) {
    return best.label;
  }

  return trimmed;
}
