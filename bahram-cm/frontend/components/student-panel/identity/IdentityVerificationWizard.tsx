'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { JalaliDateField } from '@/components/ui/JalaliDateField';
import { LiveSelfieVideoStep } from './LiveSelfieVideoStep';
import { NationalCardUploadStep } from './NationalCardUploadStep';
import { IdentityVerificationFeedback } from './IdentityVerificationFeedback';
import { saveIdentityDraftAction, submitIdentityVerificationAction } from '@/lib/student/identityActions';
import { identityStatusLabel } from '@/lib/student/identityLabels';
import {
  IDENTITY_CLIENT_ERRORS,
  IDENTITY_CLIENT_ERROR_TITLES,
  validateIdentityStep1,
} from '@/lib/student/identityVerificationErrors';
import { selfieVideoFileName } from '@/lib/media/recorder';
import { maxBirthDateForMinAge, MIN_IDENTITY_AGE } from '@/lib/student/age';
import { IdentityReviewStep } from './IdentityReviewStep';

const STEPS = ['اطلاعات هویتی', 'تصویر کارت ملی', 'ویدیوی سلفی زنده', 'بازبینی و ارسال'] as const;
const STEP_LABELS_SHORT = ['اطلاعات', 'کارت ملی', 'سلفی', 'بازبینی'] as const;

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
  initialCanSubmit = true,
  initialDraft,
  correctionItems,
}: {
  initialStatus?: string | null;
  initialCanSubmit?: boolean;
  initialDraft?: Partial<Draft> | null;
  correctionItems?: string[] | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
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
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const maxBirthDate = useMemo(() => maxBirthDateForMinAge(MIN_IDENTITY_AGE), []);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>('.panel-main-content');
    main?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [step]);

  const lockedStatuses = ['submitted', 'under_review', 'approved'];
  const isLocked =
    submitted ||
    initialCanSubmit === false ||
    (initialStatus && lockedStatuses.includes(initialStatus) && initialStatus !== 'needs_correction');
  if (isLocked) {
    const status = submitted ? 'submitted' : initialStatus;
    return (
      <div className="card p-6">
        <p className="text-sm text-text-muted">وضعیت پرونده: {identityStatusLabel(status ?? 'submitted')}</p>
        <p className="mt-2 text-sm leading-relaxed text-text">
          {status === 'approved'
            ? 'هویت شما تأیید شده است.'
            : 'پرونده شما در صف بررسی است و فعلاً قابل ویرایش نیست.'}
        </p>
      </div>
    );
  }

  function saveStep1() {
    setError(null);
    setErrorTitle(null);

    const clientError = validateIdentityStep1(draft);
    if (clientError) {
      setErrorTitle(IDENTITY_CLIENT_ERROR_TITLES.step1);
      setError(clientError);
      return;
    }

    const fd = new FormData();
    Object.entries(draft).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      const res = await saveIdentityDraftAction({}, fd);
      if (res.error) {
        setErrorTitle(res.errorTitle ?? null);
        setError(res.error);
        return;
      }
      setStep(1);
    });
  }

  function submitAll() {
    if (!cardFile && !videoBlob) {
      setErrorTitle(IDENTITY_CLIENT_ERROR_TITLES.artifacts);
      setError(IDENTITY_CLIENT_ERRORS.artifacts);
      return;
    }
    if (!cardFile) {
      setErrorTitle(IDENTITY_CLIENT_ERROR_TITLES.artifacts);
      setError(IDENTITY_CLIENT_ERRORS.cardMissing);
      return;
    }
    if (!videoBlob) {
      setErrorTitle(IDENTITY_CLIENT_ERROR_TITLES.artifacts);
      setError(IDENTITY_CLIENT_ERRORS.videoMissing);
      return;
    }
    setError(null);
    setErrorTitle(null);
    const fd = new FormData();
    Object.entries(draft).forEach(([k, v]) => fd.set(k, v));
    fd.set('national_card', cardFile);
    fd.set('selfie_video', videoBlob, selfieVideoFileName(videoBlob));
    if (videoPrompt) fd.set('expected_video_text', videoPrompt);
    startTransition(async () => {
      const res = await submitIdentityVerificationAction(fd);
      if (res.error) {
        setErrorTitle(res.errorTitle ?? null);
        setError(res.error);
        return;
      }
      setSubmitted(true);
      router.refresh();
      router.push('/panel/profile');
    });
  }

  return (
    <div className="panel-identity-wizard flex flex-col gap-4 sm:gap-5">
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
            <span className="panel-stepper-item__title panel-stepper-item__title--full">{label}</span>
            <span className="panel-stepper-item__title panel-stepper-item__title--short">{STEP_LABELS_SHORT[index]}</span>
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

      <div className="card panel-identity-wizard__card p-4 sm:p-6">
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
                maxDate={maxBirthDate}
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
          <NationalCardUploadStep
            file={cardFile}
            onFileChange={setCardFile}
            onBack={() => setStep(0)}
            onContinue={() => setStep(2)}
          />
        ) : null}

        {step === 2 ? (
          <LiveSelfieVideoStep
            hasRecording={!!videoBlob}
            onRecorded={(blob) => setVideoBlob(blob)}
            onPrompt={(text) => setVideoPrompt(text)}
            onBack={() => {
              setError(null);
              setStep(1);
            }}
            onContinue={() => {
              setError(null);
              setStep(3);
            }}
          />
        ) : null}

        {step === 3 ? (
          <IdentityReviewStep
            draft={draft}
            cardFile={cardFile}
            videoBlob={videoBlob}
            pending={pending}
            onBack={() => setStep(2)}
            onSubmit={submitAll}
          />
        ) : null}

        {error ? (
          <IdentityVerificationFeedback error={error} errorTitle={errorTitle ?? undefined} />
        ) : null}
      </div>
    </div>
  );
}
