'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { AdminPage } from '../ui';
import { getAdminInstallmentPlans, updateInstallmentPlan } from '../pricing/actions';

export default function AdminInstallmentsPage() {
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof getAdminInstallmentPlans>>>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    getAdminInstallmentPlans().then(setPlans).finally(() => setLoading(false));
  }, []);

  async function save(planId: number, field: string, value: number | boolean | string) {
    setSavingId(planId);
    await updateInstallmentPlan(planId, { [field]: value });
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, [field]: value } : p)),
    );
    setSavingId(null);
  }

  if (loading) {
    return (
      <AdminPage title="قوانین اقساط" desc="از دیتابیس">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </AdminPage>
    );
  }

  return (
    <AdminPage title="قوانین اقساط" desc="پیش‌پرداخت، حداکثر ماه و شرط چک — per treatment line">
      {!plans.length ? (
        <div className="card p-8 text-center text-small text-text-muted">پلن اقساطی در API یافت نشد.</div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <div key={plan.id} className="card grid gap-4 p-5 lg:grid-cols-4 lg:items-end">
              <div>
                <p className="font-semibold text-primary-dark">{plan.name}</p>
                <p className="text-caption text-text-muted">{plan.treatment_line_slug ?? '—'}</p>
              </div>
              <div>
                <label className="field-label">پیش‌پرداخت (٪)</label>
                <input
                  type="number"
                  className="field-input"
                  defaultValue={plan.down_payment_pct}
                  onBlur={(e) => save(plan.id, 'down_payment_pct', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="field-label">حداکثر ماه</label>
                <input
                  type="number"
                  className="field-input"
                  defaultValue={plan.max_months}
                  onBlur={(e) => save(plan.id, 'max_months', Number(e.target.value))}
                />
              </div>
              <label className="flex items-center gap-2 text-small">
                <input
                  type="checkbox"
                  defaultChecked={plan.requires_cheque}
                  onChange={(e) => save(plan.id, 'requires_cheque', e.target.checked)}
                />
                نیاز به چک
                {savingId === plan.id && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </label>
            </div>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
