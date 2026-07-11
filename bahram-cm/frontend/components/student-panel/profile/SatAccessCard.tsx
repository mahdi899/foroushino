import Link from 'next/link';
import { Lock, Trophy } from 'lucide-react';
import { SAT_MEMBERSHIP_FA } from '@/lib/student/identityLabels';
import type { StudentUser } from '@/lib/student/session';

export function SatAccessCard({ user }: { user: StudentUser }) {
  const status = user.sat_membership_status ?? 'inactive';
  const meta = SAT_MEMBERSHIP_FA[status] ?? SAT_MEMBERSHIP_FA.inactive;
  const active = status === 'active';

  return (
    <section className="card panel-profile-section">
      <header className="panel-profile-section__header">
        <span className="panel-profile-section__icon panel-profile-section__icon--location" aria-hidden>
          {active ? <Trophy size={20} strokeWidth={2} /> : <Lock size={20} strokeWidth={2} />}
        </span>
        <div className="panel-profile-section__heading">
          <h2 className="panel-profile-section__title">عضویت سات</h2>
          <p className="panel-profile-section__desc">{meta.label}</p>
        </div>
      </header>
      <div className="panel-profile-section__body space-y-3">
        <p className="text-sm leading-relaxed text-text-muted">{meta.hint}</p>
        <Link href="/panel/sat" className="btn btn-secondary inline-flex">
          مشاهده صفحه سات
        </Link>
      </div>
    </section>
  );
}
