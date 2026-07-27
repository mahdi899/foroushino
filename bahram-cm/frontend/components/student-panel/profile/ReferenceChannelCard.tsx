import Link from 'next/link';
import { ExternalLink, Lock, Radio, ShieldCheck, ShoppingCart } from 'lucide-react';
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
            محصول دسترسی به گروه مرجع — قیمت کامل یا با تخفیف سمینار. لینک گروه پس از خرید و تأیید هویت فعال
            می‌شود.
          </p>
        </div>
      </header>
      <div className="panel-profile-section__body">
        <div className="flex flex-wrap gap-2">
          <Link href="/panel/reference-channel" className="btn btn-primary">
            <ShoppingCart size={16} />
            خرید / مدیریت
          </Link>
          {locked ? (
            <Link href="/panel/identity-verification" className="btn btn-secondary">
              <ShieldCheck size={16} />
              احراز هویت
            </Link>
          ) : (
            <Link href="/panel/reference-channel" className="btn btn-secondary">
              <ExternalLink size={16} />
              مشاهده وضعیت
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
