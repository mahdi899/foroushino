'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { joinFamily } from '@/lib/family/api';
import { FamilyApiError } from '@/lib/family/errors';

export function JoinBanner({ id }: { id?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await joinFamily({
        source: searchParams.get('utm_source') ?? searchParams.get('src') ?? undefined,
        campaign: searchParams.get('utm_campaign') ?? undefined,
        content: searchParams.get('utm_content') ?? undefined,
        referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof FamilyApiError ? e.message : 'خطایی رخ داد. دوباره تلاش کن.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      id={id}
      className="family-glass-bar z-30 shrink-0 px-4 py-3 sm:px-5 lg:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-[680px] flex-col gap-2">
        {error && <p className="text-center text-xs text-red-400">{error}</p>}
        <div className="flex items-center justify-between gap-3 lg:gap-4">
          <p className="text-start text-xs leading-relaxed text-[var(--family-tg-subtitle)] lg:text-sm">
            برای دیدن همه پیام‌ها، واکنش و همراهی با خانواده بپیوند.
          </p>
          <button
            type="button"
            onClick={() => void handleJoin()}
            disabled={pending}
            className="family-btn-primary shrink-0 rounded-full px-4 py-2 text-xs font-bold transition disabled:opacity-60 lg:px-5 lg:py-2.5 lg:text-sm"
          >
            {pending ? '…' : 'بپیوند'}
          </button>
        </div>
      </div>
    </div>
  );
}
