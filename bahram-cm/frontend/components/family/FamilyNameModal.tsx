'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, UserRound } from 'lucide-react';
import { setFamilyDisplayName } from '@/lib/family/api';
import { FamilyApiError } from '@/lib/family/errors';

const inputClass =
  'family-input mt-1.5 h-11 w-full rounded-xl px-4 text-sm text-bone outline-none transition placeholder:text-bone/35';

export function FamilyNameModal({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;

    const first = firstName.trim();
    const last = lastName.trim();

    if (first.length < 2) {
      setError('نام باید حداقل ۲ حرف باشد.');
      return;
    }
    if (last.length < 2) {
      setError('نام خانوادگی باید حداقل ۲ حرف باشد.');
      return;
    }

    setError(null);
    setPending(true);
    try {
      await setFamilyDisplayName(first, last);
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof FamilyApiError ? err.message : 'ثبت نام ناموفق بود.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/75 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-3xl bg-charcoal p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
            <UserRound className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="text-start">
            <h2 className="text-lg font-bold text-bone">اسمت چیه؟</h2>
            <p className="mt-0.5 text-sm text-bone/60">برای نمایش توی خانواده، نام و نام خانوادگی‌ات رو بنویس.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-start">
            <span className="text-xs font-medium text-bone/55">نام</span>
            <input
              type="text"
              autoComplete="given-name"
              autoFocus
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className={inputClass}
              placeholder="مثلاً علی"
              disabled={pending}
            />
          </label>

          <label className="block text-start">
            <span className="text-xs font-medium text-bone/55">نام خانوادگی</span>
            <input
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className={inputClass}
              placeholder="مثلاً رستمی"
              disabled={pending}
            />
          </label>

          {error ? <p className="text-start text-sm text-red-400/90">{error}</p> : null}

          <button
            type="submit"
            disabled={pending}
            className="family-btn-primary mt-1 flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold transition disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ادامه'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
