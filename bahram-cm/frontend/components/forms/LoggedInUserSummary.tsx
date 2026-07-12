import { Mail, Phone, User2 } from 'lucide-react';
import type { StudentFormPrefill } from '@/lib/student/formPrefill';
import { cn } from '@/lib/cn';

export function LoggedInUserSummary({
  prefill,
  showEmail = false,
  className,
}: {
  prefill: StudentFormPrefill;
  showEmail?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-tile border border-bone/10 bg-ink/40 px-3 py-2.5',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm text-bone">
        <User2 className="h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.5} aria-hidden />
        <span>{prefill.name}</span>
      </div>
      {prefill.phone ? (
        <div className="flex items-center gap-2 text-sm text-bone-dim" dir="ltr">
          <Phone className="h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.5} aria-hidden />
          <span className="num-latin">{prefill.phone}</span>
        </div>
      ) : null}
      {showEmail && prefill.email ? (
        <div className="flex items-center gap-2 text-sm text-bone-dim" dir="ltr">
          <Mail className="h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.5} aria-hidden />
          <span>{prefill.email}</span>
        </div>
      ) : null}
    </div>
  );
}
