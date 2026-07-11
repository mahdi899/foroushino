'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { JalaliDateField } from '@/components/ui/JalaliDateField';
import { LiveSelfieVideoStep } from './LiveSelfieVideoStep';
import { saveIdentityDraftAction, submitIdentityVerificationAction } from '@/lib/student/identityActions';
import { identityStatusLabel } from '@/lib/student/identityLabels';
import { formatDateFa } from '@/lib/persian';

const STEPS = ['اطلاعات هویتی', 'تصویر کارت ملی', 'ویدیوی سلفی زنده', 'بازبینی و ارسال'] as const;

type Draft = {
  first_name: string;
  last_name: string;
  national_code: string;
  date_of_birth: string;
  gender: string;
  city: string;
};

export function IdentityVerificationWizard({
  initialStatus,
  initialDraft,
  correctionItems,
}: {
  initialStatus?: string | null;
  initialDraft?: Partial<Draft> | null;
  correctionItems?: string[] | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    first_name: initialDraft?.first_name ?? '',
    last_name: initialDraft?.last_name ?? '',
    national_code: initialDraft?.national_code ?? '',
    date_of_birth: initialDraft?.date_of_birth ?? '',
    gender: initialDraft?.gender ?? '',
    city: initialDraft?.city ?? '',
  });
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const lockedStatuses = ['submitted', 'under_review', 'approved'];
  if (initialStatus && lockedStatuses.includes(initialStatus) && initialStatus !== 'needs_correction') {
    return (
      <div className="card p-6">
        <p className="text-sm text-text-muted">وضعیت پرونده: {identityStatusLabel(initialStatus)}</p>
        <p className="mt-2 text-sm leading-relaxed text-text">
          {initialStatus === 'approved'
            ? 'هویت شما تأیید شده است.'
            : 'پرونده شما در صف بررسی است و فعلاً قابل ویرایش نیست.'}
        </p>
      </div>
    );
  }

  function saveStep1() {
    setError(null);
    setMessage(null);
    const fd = new FormData();
    Object.entries(draft).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      const res = await saveIdentityDraftAction({}, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage(res.success ?? null);
      setStep(1);
    });
  }

  function submitAll() {
    if (!cardFile || !videoBlob) {
      setError('تصویر کارت ملی و ویدیوی سلفی الزامی است.');
      return;
    }
    setError(null);
    const fd = new FormData();
    Object.entries(draft).forEach(([k, v]) => fd.set(k, v));
    fd.set('national_card', cardFile);
    fd.set('selfie_video', videoBlob, 'selfie.webm');
    if (videoPrompt) fd.set('expected_video_text', videoPrompt);
    startTransition(async () => {
      const res = await submitIdentityVerificationAction(fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage(res.success ?? 'ارسال شد.');
      router.refresh();
      router.push('/panel/profile');
    });
  }

  return (
    <div className="space-y-5">
      <ol className="panel-stepper-list panel-stepper-list--wizard">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className="panel-stepper-item panel-stepper-item--wizard"
            data-state={index < step ? 'done' : index === step ? 'active' : 'pending'}
          >
            <span className="panel-stepper-item__dot">
              {index < step ? <CheckCircle2 size={14} /> : index + 1}
            </span>
            <span className="panel-stepper-item__title">{label}</span>
          </li>
        ))}
      </ol>

      {correctionItems?.length ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text">
          <p className="font-bold">موارد نیازمند اصلاح:</p>
          <ul className="mt-1 list-inside list-disc text-text-muted">
            {correctionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card p-5 sm:p-6">
        {step === 0 ? (
          <div className="panel-form-grid">
            <p className="panel-form-grid__full text-sm leading-relaxed text-text-muted">
              نام و شهر باید دقیقاً مطابق کارت ملی باشد. در صورت تمایل، نام نمایشی حساب به‌عنوان پیشنهاد اولیه پر شده است.
            </p>
            <div>
              <label className="field-label" htmlFor="first_name">
                نام
              </label>
              <input
                id="first_name"
                className="field-input"
                value={draft.first_name}
                onChange={(e) => setDraft((d) => ({ ...d, first_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="last_name">
                نام خانوادگی
              </label>
              <input
                id="last_name"
                className="field-input"
                value={draft.last_name}
                onChange={(e) => setDraft((d) => ({ ...d, last_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="national_code">
                کد ملی
              </label>
              <input
                id="national_code"
                className="field-input"
                dir="ltr"
                inputMode="numeric"
                maxLength={10}
                value={draft.national_code}
                onChange={(e) => setDraft((d) => ({ ...d, national_code: e.target.value.replace(/\D/g, '') }))}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="date_of_birth" id="date_of_birth-label">
                تاریخ تولد
              </label>
              <JalaliDateField
                id="date_of_birth"
                value={draft.date_of_birth}
                onChange={(date_of_birth) => setDraft((d) => ({ ...d, date_of_birth }))}
                placeholder="مثال: ۱۳۷۵/۰۳/۱۵"
                maxDate={new Date()}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="gender">
                جنسیت
              </label>
              <select
                id="gender"
                className="field-input"
                value={draft.gender}
                onChange={(e) => setDraft((d) => ({ ...d, gender: e.target.value }))}
                required
              >
                <option value="">انتخاب کنید</option>
                <option value="male">مرد</option>
                <option value="female">زن</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="city">
                شهر
              </label>
              <input
                id="city"
                className="field-input"
                value={draft.city}
                onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                required
              />
            </div>
            <button type="button" className="btn btn-primary panel-form-grid__full" disabled={pending} onClick={saveStep1}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              ذخیره و ادامه
            </button>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">تصویر واضح از روی کارت ملی را بارگذاری کنید.</p>
            <input
              type="file"
              accept="image/*"
              className="field-input"
              onChange={(e) => setCardFile(e.target.files?.[0] ?? null)}
            />
            {cardFile ? <p className="text-sm text-success">فایل انتخاب شد: {cardFile.name}</p> : null}
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(0)}>
                قبلی
              </button>
              <button type="button" className="btn btn-primary" disabled={!cardFile} onClick={() => setStep(2)}>
                ادامه
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <LiveSelfieVideoStep
              onRecorded={(blob) => setVideoBlob(blob)}
              onPrompt={(text) => setVideoPrompt(text)}
            />
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                قبلی
              </button>
              <button type="button" className="btn btn-primary" disabled={!videoBlob} onClick={() => setStep(3)}>
                ادامه
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <h3 className="font-bold text-text">بازبینی نهایی</h3>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-muted">نام</dt>
                <dd>
                  {draft.first_name} {draft.last_name}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">کد ملی</dt>
                <dd dir="ltr">{draft.national_code}</dd>
              </div>
              <div>
                <dt className="text-text-muted">تاریخ تولد</dt>
                <dd>{draft.date_of_birth ? formatDateFa(draft.date_of_birth) : '—'}</dd>
              </div>
              <div>
                <dt className="text-text-muted">شهر</dt>
                <dd>{draft.city}</dd>
              </div>
              <div>
                <dt className="text-text-muted">مدارک</dt>
                <dd>
                  {cardFile ? 'کارت ملی ✓' : 'کارت ملی ✗'} · {videoBlob ? 'ویدیو ✓' : 'ویدیو ✗'}
                </dd>
              </div>
            </dl>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                قبلی
              </button>
              <button type="button" className="btn btn-primary" disabled={pending} onClick={submitAll}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                ارسال برای بررسی
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-success">{message}</p> : null}
      </div>
    </div>
  );
}
