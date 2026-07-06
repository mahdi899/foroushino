import 'server-only';
import { apiData } from './client';
import { getRevalidateSeconds } from '@/lib/cache/revalidate';
import type { ApiTreatmentLine } from './types';

export async function getTreatments(): Promise<ApiTreatmentLine[]> {
  return apiData<ApiTreatmentLine[]>('/pricing/treatments', {
    revalidate: await getRevalidateSeconds('pricing'),
    tags: ['pricing'],
  });
}
