import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function IdentityVerificationFeedback({
  error,
  errorTitle = 'خطا در انجام درخواست',
  success,
}: {
  error?: string | null;
  errorTitle?: string;
  success?: string | null;
}) {
  if (!error && !success) return null;

  return (
    <div className="panel-identity-feedback">
      {error ? (
        <div className="panel-identity-feedback__box panel-identity-feedback__box--error" role="alert">
          <span className="panel-identity-feedback__icon" aria-hidden>
            <AlertCircle size={18} strokeWidth={2} />
          </span>
          <div className="panel-identity-feedback__copy">
            <p className="panel-identity-feedback__title">{errorTitle}</p>
            <p className="panel-identity-feedback__text">{error}</p>
          </div>
        </div>
      ) : null}
      {success ? (
        <div className="panel-identity-feedback__box panel-identity-feedback__box--success" role="status">
          <span className="panel-identity-feedback__icon" aria-hidden>
            <CheckCircle2 size={18} strokeWidth={2} />
          </span>
          <div className="panel-identity-feedback__copy">
            <p className="panel-identity-feedback__text">{success}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
