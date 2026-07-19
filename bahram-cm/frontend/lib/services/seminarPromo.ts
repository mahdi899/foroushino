import { getStaticJson } from './staticFetch';

export type SeminarPromo = {
  seminar_id: number;
  title: string;
  banner_url: string;
  banner_url_mobile: string;
  banner_alt: string;
  link: string | null;
  variant: 'available' | 'full';
  is_full: boolean;
  remaining_seats: number | null;
  capacity: number | null;
  attendees_count: number;
};

type PromoResponse = { data: SeminarPromo | null };

export async function getActiveSeminarPromo(): Promise<SeminarPromo | null> {
  const result = await getStaticJson<PromoResponse>('/seminars/promo', {
    ttlKey: 'home',
    tags: ['seminars', 'home', 'services'],
  });
  if (!result.ok || !result.data.data) return null;
  return result.data.data;
}
