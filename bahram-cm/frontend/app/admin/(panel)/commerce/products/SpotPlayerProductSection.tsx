import Link from 'next/link';

export function SpotPlayerProductSection({
  courseIds,
  onCourseIdsChange,
}: {
  courseIds: string;
  onCourseIdsChange: (value: string) => void;
}) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h3 font-bold text-primary-dark">SpotPlayer</h2>
        <Link href="/admin/settings#sms-spotplayer-credentials" className="text-caption text-primary hover:underline">
          تنظیمات API
        </Link>
      </div>

      <label>
        <span className="field-label">شناسه دوره</span>
        <input
          className="field-input font-mono text-caption"
          dir="ltr"
          placeholder="5d2ee35bcddc092a304ae5eb"
          value={courseIds}
          onChange={(e) => onCourseIdsChange(e.target.value)}
        />
        <p className="mt-1.5 text-caption text-text-muted">از پنل SpotPlayer کپی کنید. چند دوره با کاما.</p>
      </label>
    </div>
  );
}
