import Link from 'next/link';
import { ExternalLink, Lock, Radio, ShieldCheck } from 'lucide-react';
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
            {locked
              ? 'پس از خرید و تأیید هویت، لینک گروه مرجع فعال می‌شود'
              : 'از منوی کانال مرجع وضعیت دسترسی و لینک گروه را ببینید'}
          </p>
        </div>
      </header>
      <div className="panel-profile-section__body">
        <div className="flex flex-wrap gap-2">
          {locked ? (
            <Link href="/panel/identity-verification" className="btn btn-primary">
              <ShieldCheck size={16} />
              احراز هویت
            </Link>
          ) : null}
          <Link href="/panel/reference-channel" className="btn btn-secondary">
            <ExternalLink size={16} />
            مشاهده کانال مرجع
          </Link>
        </div>
      </div>
    </section>
  );
}
