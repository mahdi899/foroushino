/** Compact Persian copy for seminar-attendee reference-channel pricing. */

export function formatSeminarDiscountCopy(title: string | null | undefined): {
  ribbon: string;
  hint: string;
  stickyHint: string;
  shortName: string;
} {
  const raw = (title ?? '').trim();
  const shortName = raw.includes('زعفرانیه')
    ? 'سمینار زعفرانیه'
    : raw || 'سمینار';

  return {
    shortName,
    ribbon: `ویژه ${shortName}`,
    hint: `چون شرکت‌کننده ${shortName} هستی، این قیمت برای توست`,
    stickyHint: `ویژه ${shortName}`,
  };
}
