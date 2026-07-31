'use client';

import { useId, useMemo, useState } from 'react';
import { Check, Copy, Smartphone, Video } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

type Props = {
  onBack: () => void;
};

export function SelfieMobileHandoff({ onBack }: Props) {
  const titleId = useId();
  const [copied, setCopied] = useState(false);

  const resumeUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '/panel/identity-verification?step=selfie';
    }
    return `${window.location.origin}/panel/identity-verification?step=selfie`;
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(resumeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="panel-identity-selfie-handoff-overlay" aria-hidden={false}>
      <div className="panel-identity-selfie-handoff-overlay__backdrop" aria-hidden />

      <div
        className="panel-identity-selfie-handoff"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="panel-identity-selfie-handoff__header">
          <span className="panel-identity-selfie-handoff__icon" aria-hidden>
            <Video size={20} strokeWidth={2} />
          </span>
          <div>
            <h3 className="panel-identity-selfie-handoff__title" id={titleId}>
              احراز هویت سلفی الزاماً با گوشی موبایل
            </h3>
            <p className="panel-identity-selfie-handoff__lead">
              برای تکمیل این مرحله، نیاز به دسترسی به دوربین سلفی گوشی خود دارید. لطفا با گوشی موبایل
              وارد شده و ادامه دهید.
            </p>
          </div>
        </div>

        <div className="panel-identity-selfie-handoff__body">
          <div className="panel-identity-selfie-handoff__qr-wrap">
            <QRCodeSVG value={resumeUrl} size={168} level="M" className="panel-identity-selfie-handoff__qr" />
            <p className="panel-identity-selfie-handoff__qr-hint">
              <Smartphone size={14} aria-hidden />
              QR را با دوربین گوشی اسکن کنید
            </p>
          </div>

          <div className="panel-identity-selfie-handoff__link-block">
            <p className="panel-identity-selfie-handoff__link-label">یا این لینک را در مرورگر گوشی باز کنید:</p>
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="panel-identity-selfie-handoff__link"
              dir="ltr"
            >
              {resumeUrl}
            </a>
            <button
              type="button"
              className="btn btn-secondary panel-identity-selfie-handoff__copy"
              onClick={() => void copyLink()}
            >
              {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
              {copied ? 'کپی شد' : 'کپی لینک'}
            </button>
          </div>
        </div>

        <ul className="panel-identity-selfie-handoff__steps">
          <li>با همان حساب کاربری در گوشی وارد شوید.</li>
          <li>ویدیوی سلفی را ضبط و پرونده را ارسال کنید.</li>
          <li>پس از ارسال، وضعیت در پنل دسکتاپ هم به‌روز می‌شود.</li>
        </ul>

        <div className="panel-identity-step__actions">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            قبلی
          </button>
        </div>
      </div>
    </div>
  );
}
