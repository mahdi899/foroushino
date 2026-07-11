import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, CheckCircle2, Clock, Crown, FileText, Lock, Search, Trophy, XCircle } from 'lucide-react';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import { SatApplicationForm } from '@/components/student-panel/sat/SatApplicationForm';
import { getCurrentStudent } from '@/lib/student/session';
import { panelStudentFetch } from '@/lib/student/panelServer';
import { SAT_MEMBERSHIP_FA } from '@/lib/student/identityLabels';

export const metadata: Metadata = { title: 'سات | پنل کاربری', robots: { index: false, follow: false } };

interface SatApplication {
  id: number;
  status: string;
  city: string | null;
  age: number | null;
  submitted_at: string | null;
}

const STATUS: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  received: { label: 'دریافت شد', icon: Briefcase, className: 'bg-green-500/10 text-green-400' },
  reviewing: { label: 'در حال بررسی', icon: Search, className: 'bg-yellow-500/10 text-yellow-400' },
  accepted: { label: 'پذیرفته شد', icon: CheckCircle2, className: 'bg-green-500/10 text-green-400' },
  rejected: { label: 'رد شده', icon: XCircle, className: 'bg-red-500/10 text-red-400' },
};

const STEPS = [
  { key: 'received', title: 'دریافت شد', desc: 'درخواست شما ثبت و در صف بررسی قرار گرفت.' },
  { key: 'reviewing', title: 'در حال بررسی', desc: 'تیم آکادمی در حال ارزیابی اطلاعات شماست.' },
  { key: 'accepted', title: 'پذیرفته شد', desc: 'نتیجه نهایی از طریق پنل و پیامک اطلاع‌رسانی می‌شود.' },
] as const;

function stepState(current: string | null, stepKey: string): 'done' | 'active' | 'pending' {
  if (!current) return 'pending';
  const order = ['received', 'reviewing', 'accepted', 'rejected'];
  const currentIdx = order.indexOf(current);
  const stepIdx = order.indexOf(stepKey);
  if (current === 'rejected' && stepKey === 'accepted') return 'pending';
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx || (current === 'reviewing' && stepKey === 'reviewing')) return 'active';
  if (current === 'accepted' && stepKey === 'accepted') return 'done';
  return 'pending';
}

export default async function PanelSatPage() {
  const [user, { data: application }] = await Promise.all([
    getCurrentStudent(),
    panelStudentFetch<{ data: SatApplication | null }>('/sat-application'),
  ]);
  const status = application ? (STATUS[application.status] ?? STATUS.received) : null;
  const currentStatus = application?.status ?? null;
  const membershipStatus = user?.sat_membership_status ?? 'inactive';
  const membershipMeta = SAT_MEMBERSHIP_FA[membershipStatus] ?? SAT_MEMBERSHIP_FA.inactive;
  const membershipActive = membershipStatus === 'active';
  const acceptedButLocked = application?.status === 'accepted' && !membershipActive;

  return (
    <div className="panel-page-inner flex flex-col gap-6">
      <PanelPageHeader
        icon={Trophy}
        title="فرصت همکاری در سات"
        description="اگر علاقه‌مند به همکاری با آکادمی هستی، فرم زیر را تکمیل کن."
      />

      <div
        className={`card flex items-start gap-3 p-5 ${
          membershipActive ? 'border-[#008c96]/30 bg-[#008c96]/5' : 'border-border'
        }`}
      >
        <span className="mt-0.5 text-primary">
          {membershipActive ? <Trophy size={22} /> : <Lock size={22} />}
        </span>
        <div>
          <p className="font-bold text-text">{membershipMeta.label}</p>
          <p className="mt-1 text-sm leading-relaxed text-text-muted">{membershipMeta.hint}</p>
          {acceptedButLocked ? (
            <p className="mt-2 text-sm text-text">
              درخواست شما پذیرفته شده، اما دسترسی هنوز قفل است. برای فعال‌سازی،{' '}
              <Link href="/panel/identity-verification" className="font-medium text-primary underline">
                هویت خود را تأیید کنید
              </Link>
              .
            </p>
          ) : null}
        </div>
      </div>

      <div className="panel-aside-layout">
        <div className="flex flex-col gap-5">
          {!application ? (
            <div className="rounded-xl border border-border bg-surface-soft p-4 text-sm leading-relaxed text-text-muted">
              هنوز درخواستی ثبت نکرده‌ای. فرم زیر را تکمیل کن تا تیم ما بررسی کند.
            </div>
          ) : null}

          {application ? (
            <div className="card p-6">
              <p className="mb-3 text-sm text-text-muted">وضعیت درخواست شما:</p>
              {status && (
                <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${status.className}`}>
                  <status.icon size={18} />
                  {status.label}
                </div>
              )}
              {application.submitted_at && (
                <p className="panel-card-subtext mt-3">
                  ثبت شده در {new Date(application.submitted_at).toLocaleDateString('fa-IR')}
                </p>
              )}
            </div>
          ) : (
            <div className="card p-6">
              <h2 className="panel-card-title mb-4 flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                فرم درخواست سات
              </h2>
              <SatApplicationForm mobile={user?.mobile ?? ''} />
              <p className="panel-card-subtext mt-4 leading-relaxed">
                اطلاعات شما محرمانه نگه داشته می‌شود و فقط برای بررسی درخواست استفاده می‌شود.
              </p>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="panel-card-title mb-4">فرآیند بررسی درخواست</h2>
            <ol className="panel-stepper-list space-y-4">
              {STEPS.map((step, index) => (
                <li key={step.key} className="panel-stepper-item" data-state={stepState(currentStatus, step.key)}>
                  <span className="panel-stepper-item__dot">
                    {stepState(currentStatus, step.key) === 'done' ? <CheckCircle2 size={14} /> : index + 1}
                  </span>
                  <div>
                    <p className="panel-stepper-item__title">{step.title}</p>
                    <p className="panel-stepper-item__desc">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="card relative overflow-hidden p-5">
            <h3 className="panel-card-title">یک قدم تا فرصت بهتر!</h3>
            <p className="panel-card-text mt-2 leading-relaxed">
              با تکمیل دوره‌های آکادمی، شانس پذیرش در سات بیشتر می‌شود.
            </p>
            <ul className="panel-card-text mt-3 space-y-2">
              {['دسترسی به محتوای تخصصی', 'گواهی معتبر', 'شبکه ارتباطی فعال'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-success" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/panel/courses" className="btn btn-primary panel-text-body mt-4 w-full">
              <Crown size={14} />
              مشاهده و تهیه دوره
            </Link>
            <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-primary/10 blur-3xl" />
          </div>
        </aside>
      </div>
    </div>
  );
}
