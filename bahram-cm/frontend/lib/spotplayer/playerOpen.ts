import type {} from '@/types/spotplayer';

export async function openSpotPlayer(
  player: SpotPlayerInstance,
  licenseKey: string,
  courseId: string,
  itemId?: string | number | null,
): Promise<void> {
  const trimmedKey = licenseKey.trim();
  const trimmedCourse = courseId.trim();

  if (!trimmedKey) {
    throw new Error('کلید لایسنس SpotPlayer یافت نشد.');
  }

  if (itemId != null && String(itemId).trim() !== '') {
    if (trimmedCourse) {
      await player.Open(trimmedKey, trimmedCourse, itemId);
      return;
    }
    await player.Open(trimmedKey, undefined, itemId);
    return;
  }

  if (trimmedCourse) {
    await player.Open(trimmedKey, trimmedCourse);
    return;
  }

  await player.Open(trimmedKey);
}
