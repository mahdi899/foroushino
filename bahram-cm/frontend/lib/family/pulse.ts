import 'server-only';

import { SERVER_API_URL } from '@/lib/api/config';
import { getRevalidateSeconds } from '@/lib/cache/revalidate';
import type { FamilyPulseItem } from './types';

/** Public homepage marquee — managed from admin › نظرات دانشجوها. */
export async function getFamilyPulse(): Promise<FamilyPulseItem[]> {
  try {
    const revalidate = await getRevalidateSeconds('home');
    const res = await fetch(`${SERVER_API_URL}/family/pulse`, {
      headers: { Accept: 'application/json' },
      next: { revalidate, tags: ['home', 'testimonials'] },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data: FamilyPulseItem[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}
