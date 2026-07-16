'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { joinFamily } from '@/lib/family/api';
import { buildFamilyJoinContext } from '@/lib/family/join-context';
import { FamilyApiError } from '@/lib/family/errors';
import { FamilyBrandLogo } from '@/components/family/FamilyBrandLogo';
import { useFamilyBranding } from '@/lib/family/hooks/useFamilyBranding';

const rules = (profileName: string) => [
  `${profileName} مستقیم پست می‌ذاره، صوتی، ویدیویی و متنی.`,
  'کامنت‌ها قبل از نمایش عمومی بررسی می‌شن؛ محتوای نامرتبط یا تبلیغاتی رد می‌شه.',
  'شماره تو در اختیار بقیه اعضا قرار نمی‌گیره.',
];

export function JoinScreen() {
  const { branding } = useFamilyBranding();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await joinFamily(buildFamilyJoinContext(searchParams));
      router.refresh();
    } catch (e) {
      setError(e instanceof FamilyApiError ? e.message : 'خطایی رخ داد. دوباره تلاش کن.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center sm:px-8 lg:py-16">
      <FamilyBrandLogo className="mb-4" size="md" />
      <h1 className="text-xl font-bold text-bone lg:text-2xl">به {branding.display_name} بپیوند</h1>
      <p className="mt-2 max-w-sm text-sm text-bone/60 lg:max-w-md lg:text-[15px]">
        یه فضای نزدیک و واقعی، جایی که {branding.profile_name} مستقیم باهات در ارتباطه.
      </p>

      <ul className="mt-6 w-full max-w-sm space-y-2 text-right">
        {rules(branding.profile_name).map((rule, i) => (
          <li key={i} className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-bone/70">
            <span className="mt-0.5 text-gold">•</span>
            {rule}
          </li>
        ))}
      </ul>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleJoin}
        disabled={pending}
        className="family-btn-primary mt-6 flex w-full max-w-sm items-center justify-center rounded-full py-3 text-sm font-bold transition disabled:opacity-60"
      >
        {pending ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        ) : (
          'بپیوند به خانواده'
        )}
      </button>
    </div>
  );
}
