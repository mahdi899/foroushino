import { SERVER_API_URL } from '@/lib/api/config';
import type { FamilyPulseItem } from './types';

/** Public, sanitized — no auth, no PII beyond first name (already enforced server-side). */
export async function getFamilyPulse(): Promise<FamilyPulseItem[]> {
  try {
    const res = await fetch(`${SERVER_API_URL}/family/pulse`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data: FamilyPulseItem[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}
