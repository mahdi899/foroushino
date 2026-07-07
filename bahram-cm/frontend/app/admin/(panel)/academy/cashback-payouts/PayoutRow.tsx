'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Loader2 } from 'lucide-react';
import { revealCashbackPayout, updateCashbackPayoutStatus } from '../actions';
import { CASHBACK_STATUS_LABELS, formatDate, formatToman, type AdminCashbackPayout } from '@/lib/admin/academyTypes';

export function PayoutRow({ payout }: { payout: AdminCashbackPayout }) {
  const router = useRouter();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onReveal() {
    setRevealing(true);
    const res = await revealCashbackPayout(payout.id);
    setRevealing(false);
    if (res.ok) {
      setRevealed(`${res.data.card_number} — ${res.data.card_holder_name ?? ''}`);
    }
  }

  return (
    <tr className="hover:bg-surface-soft/40">
      <td className="px-4 py-3">{payout.user_name ?? '—'} <span className="text-caption text-text-muted" dir="ltr">{payout.user_mobile}</span></td>
      <td className="px-4 py-3">{formatToman(payout.amount)}</td>
      <td className="px-4 py-3">
        {revealed ? (
          <span dir="ltr" className="font-mono text-caption text-danger">{revealed}</span>
        ) : (
          <button type="button" onClick={() => void onReveal()} disabled={revealing} className="inline-flex items-center gap-1 text-caption text-accent hover:text-primary">
            {revealing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            {payout.masked_card_number ?? 'نمایش شماره کارت'}
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <select
          className="field-input py-1 text-caption"
          defaultValue={payout.status}
          disabled={saving}
          onChange={(e) => {
            const value = e.target.value;
            setSaving(true);
            void updateCashbackPayoutStatus(payout.id, value).then(() => {
              setSaving(false);
              router.refresh();
            });
          }}
        >
          {Object.entries(CASHBACK_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-caption">{formatDate(payout.created_at)}</td>
    </tr>
  );
}
