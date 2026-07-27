'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { addReferenceChannelEntitlement } from '../../actions';
import type { AdminReferenceChannelDetail } from '@/lib/admin/academyTypes';

export function ReferenceChannelEntitlementsPanel({ channel }: { channel: AdminReferenceChannelDetail }) {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    const res = await addReferenceChannelEntitlement(channel.id, {
      mobile,
      name: name || undefined,
    });
    setPending(false);
    if (res.ok) {
      setMobile('');
      setName('');
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="card space-y-4 p-6">
      <div>
        <h2 className="text-h3 text-primary-dark">دسترسی‌ها</h2>
        <p className="mt-1 text-small text-text-muted">افزودن دستی دسترسی با شماره موبایل.</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
        <label>
          <span className="field-label">موبایل</span>
          <input className="field-input" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
        </label>
        <label>
          <span className="field-label">نام (اختیاری)</span>
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="flex items-end">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            افزودن
          </button>
        </div>
      </form>
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-text-muted">
              <th className="py-2">نام</th>
              <th className="py-2">موبایل</th>
              <th className="py-2">منبع</th>
            </tr>
          </thead>
          <tbody>
            {channel.entitlements.map((e) => (
              <tr key={e.id} className="border-b border-border/60">
                <td className="py-2">{e.name ?? '—'}</td>
                <td className="py-2">{e.mobile ?? '—'}</td>
                <td className="py-2">{e.source}</td>
              </tr>
            ))}
            {channel.entitlements.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-text-muted">
                  هنوز دسترسی‌ای ثبت نشده است.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
