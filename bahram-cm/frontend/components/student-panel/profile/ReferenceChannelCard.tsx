import { Lock, Radio } from 'lucide-react';
import type { StudentUser } from '@/lib/student/session';

export function ReferenceChannelCard({ user }: { user: StudentUser }) {
  const level = user.verification_level ?? 1;
  const locked = level < 2;

  return (
    <section className="card panel-profile-section">
      <header className="panel-profile-section__header">
        <span className="panel-profile-section__icon panel-profile-section__icon--social" aria-hidden>
          {locked ? <Lock size={20} strokeWidth={2} /> : <Radio size={20} strokeWidth={2} />}
        </span>
        <div className="panel-profile-section__heading">
          <h2 className="panel-profile-section__title">کانال مرجع</h2>
          <p className="panel-profile-section__desc">
            {locked ? 'پس از تأیید هویت در دسترس قرار می‌گیرد' : 'به‌زودی فعال می‌شود'}
          </p>
        </div>
      </header>
      <div className="panel-profile-section__body">
        <div className="rounded-xl border border-dashed border-border bg-surface-soft px-4 py-5 text-center">
          <p className="text-sm font-medium text-text">به‌زودی</p>
          <p className="mt-1 text-sm leading-relaxed text-text-muted">
            {locked
              ? 'این بخش برای حساب پایه قفل است. ابتدا هویت خود را تأیید کنید.'
              : 'امکان معرفی کانال مرجع به‌زودی در پنل فعال می‌شود.'}
          </p>
        </div>
      </div>
    </section>
  );
}
