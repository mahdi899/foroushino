'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { AdminPage } from '../ui';
import type { ApiTreatmentLine } from '@/lib/api/types';
import { formatNumber } from '@/lib/utils';
import { DEFAULT_PRICING_SETTINGS } from '@/lib/pricing/settings';
import { getAdminTreatmentLines, getPricingSettings, savePricingSettings, updateTreatmentBrand } from './actions';

export default function AdminPricingPage() {
  const [lines, setLines] = useState<ApiTreatmentLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [copyDraft, setCopyDraft] = useState({ module_title: '', module_sub: '', primary_cta: '' });
  const [copySaving, setCopySaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, { price_from: number; short_copy: string }>>({});

  useEffect(() => {
    getAdminTreatmentLines()
      .then((data) => {
        setLines(data);
        const initial: Record<number, { price_from: number; short_copy: string }> = {};
        data.forEach((line) =>
          line.brands.forEach((b) => {
            initial[b.id] = { price_from: b.price_from, short_copy: b.short_copy ?? '' };
          }),
        );
        setDrafts(initial);
      })
      .finally(() => setLoading(false));
    getPricingSettings().then((s) =>
      setCopyDraft({
        module_title: String(s.module_title ?? DEFAULT_PRICING_SETTINGS.module_title),
        module_sub: String(s.module_sub ?? DEFAULT_PRICING_SETTINGS.module_sub),
        primary_cta: String(s.primary_cta ?? DEFAULT_PRICING_SETTINGS.primary_cta),
      }),
    );
  }, []);

  async function saveCopy() {
    setCopySaving(true);
    await savePricingSettings(copyDraft);
    setCopySaving(false);
  }

  async function saveBrand(brandId: number) {
    const draft = drafts[brandId];
    if (!draft) return;
    setSavingId(brandId);
    await updateTreatmentBrand(brandId, draft);
    setSavingId(null);
  }

  if (loading) {
    return (
      <AdminPage title="قیمت‌ها" desc="لاین‌های درمان و برندها (API)">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminPage>
    );
  }

  if (!lines.length) {
    return (
      <AdminPage title="قیمت‌ها" desc="اتصال به API لازم است">
        <div className="card p-8 text-center text-small text-text-muted">
          داده‌ای از <code className="text-primary">/api/v1/treatment-lines</code> دریافت نشد. بک‌اند Laravel را اجرا
          کنید و seeder را بزنید.
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="قیمت‌ها و لاین‌های درمان" desc="ویرایش قیمت پایه و توضیح هر برند — مستقیم از دیتابیس">
      <div className="card mb-8 p-6">
        <h2 className="mb-4 text-h3 text-primary-dark">متن‌های ماژول قیمت‌گذاری</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="field-label">تیتر صفحه قیمت</label>
            <input
              className="field-input"
              value={copyDraft.module_title}
              onChange={(e) => setCopyDraft((c) => ({ ...c, module_title: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label">CTA اصلی</label>
            <input
              className="field-input"
              value={copyDraft.primary_cta}
              onChange={(e) => setCopyDraft((c) => ({ ...c, primary_cta: e.target.value }))}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="field-label">زیرتیتر</label>
            <textarea
              className="field-input min-h-[4rem]"
              value={copyDraft.module_sub}
              onChange={(e) => setCopyDraft((c) => ({ ...c, module_sub: e.target.value }))}
            />
          </div>
        </div>
        <button type="button" onClick={saveCopy} disabled={copySaving} className="btn btn-secondary mt-4">
          {copySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره متن‌ها
        </button>
      </div>
      <div className="space-y-8">
        {lines.map((line) => (
          <div key={line.slug} className="card overflow-hidden">
            <div className="border-b border-border bg-surface-soft/60 px-5 py-4">
              <h2 className="text-h3 text-primary-dark">{line.name_fa}</h2>
              <p className="mt-1 text-caption text-text-muted">{line.intro}</p>
            </div>
            <div className="divide-y divide-border">
              {line.brands.map((brand) => (
                <div key={brand.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_12rem_8rem] lg:items-end">
                  <div>
                    <p className="font-semibold text-primary-dark">
                      {brand.name_fa}
                      {brand.badge && (
                        <span className="ms-2 rounded-pill bg-secondary-soft px-2 py-0.5 admin-text-caption">{brand.badge}</span>
                      )}
                    </p>
                    {brand.models.length > 0 && (
                      <p className="mt-1 text-caption text-text-muted">مدل‌ها: {brand.models.join('، ')}</p>
                    )}
                    <textarea
                      className="field-input mt-2 min-h-[4rem] text-small"
                      value={drafts[brand.id]?.short_copy ?? ''}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [brand.id]: { ...d[brand.id], short_copy: e.target.value } }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label">قیمت از (تومان)</label>
                    <input
                      type="number"
                      className="field-input tnum"
                      value={drafts[brand.id]?.price_from ?? brand.price_from}
                      onChange={(e) =>
                        setDrafts((d) => ({
                          ...d,
                          [brand.id]: { ...d[brand.id], price_from: Number(e.target.value) },
                        }))
                      }
                    />
                    <p className="mt-1 text-caption text-text-muted">
                      نمایش: از {formatNumber(drafts[brand.id]?.price_from ?? brand.price_from)} تومان
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveBrand(brand.id)}
                    disabled={savingId === brand.id}
                    className="btn btn-primary justify-center"
                  >
                    {savingId === brand.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    ذخیره
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AdminPage>
  );
}
