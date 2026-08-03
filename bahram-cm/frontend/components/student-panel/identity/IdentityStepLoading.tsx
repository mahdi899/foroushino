import { Loader2 } from 'lucide-react';

export function IdentityStepLoading({ label = 'در حال بارگذاری…' }: { label?: string }) {
  return (
    <p className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </p>
  );
}
