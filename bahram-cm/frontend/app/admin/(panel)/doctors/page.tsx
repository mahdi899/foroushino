'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { AdminPage } from '../ui';
import { ImageUrlField } from '../content/ImageUrlField';
import { getAdminDoctors, updateDoctor } from '../content/actions';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import type { ApiDoctor } from '@/lib/api/types';

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<ApiDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { name_fa: string; title: string; bio: string; image_url: string }>>({});

  useEffect(() => {
    getAdminDoctors()
      .then((data) => {
        setDoctors(data);
        const initial: typeof drafts = {};
        data.forEach((d) => {
          initial[d.id] = {
            name_fa: d.name_fa,
            title: d.title,
            bio: d.bio ?? '',
            image_url: d.image_url ?? '',
          };
        });
        setDrafts(initial);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(d: ApiDoctor) {
    const draft = drafts[d.id];
    if (!draft) return;
    setSavingId(d.id);
    await updateDoctor(d.id, draft);
    setSavingId(null);
  }

  if (loading) {
    return (
      <AdminPage title="تیم درمان آترین" desc="نام و تصویر اعضای تیم">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminPage>
    );
  }

  if (!doctors.length) {
    return (
      <AdminPage title="تیم درمان آترین" desc="نام و تصویر اعضای تیم">
        <div className="card p-8 text-center text-small text-text-muted">
          داده‌ای از API دریافت نشد. بک‌اند Laravel را اجرا و seeder را بزنید.
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="تیم درمان آترین" desc="نام، تخصص و تصویر — تغییرات در کل سایت اعمال می‌شود">
      <div className="grid gap-6 lg:grid-cols-2">
        {doctors.map((d) => {
          const draft = drafts[d.id];
          return (
            <div key={d.id} className="card p-5">
              <div className="mb-4 flex items-start gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-surface-soft">
                  {draft?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(draft.image_url)}
                      alt={draft.name_fa}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-caption text-text-muted">
                      بدون عکس
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    className="field-input mb-2 font-semibold"
                    value={draft?.name_fa ?? ''}
                    onChange={(e) => setDrafts((s) => ({ ...s, [d.id]: { ...s[d.id], name_fa: e.target.value } }))}
                    placeholder="نام"
                  />
                  <input
                    className="field-input text-small"
                    value={draft?.title ?? ''}
                    onChange={(e) => setDrafts((s) => ({ ...s, [d.id]: { ...s[d.id], title: e.target.value } }))}
                    placeholder="تخصص"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="field-label">بیوگرافی</label>
                <textarea
                  className="field-input min-h-[5rem] text-small"
                  value={draft?.bio ?? ''}
                  onChange={(e) => setDrafts((s) => ({ ...s, [d.id]: { ...s[d.id], bio: e.target.value } }))}
                />
              </div>
              <ImageUrlField
                label="تصویر پروفایل"
                value={draft?.image_url ?? ''}
                onChange={(url) => setDrafts((s) => ({ ...s, [d.id]: { ...s[d.id], image_url: url } }))}
                alt={draft?.name_fa}
              />
              <button type="button" onClick={() => save(d)} disabled={savingId === d.id} className="btn btn-primary mt-4 w-full justify-center text-small">
                {savingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                ذخیره
              </button>
            </div>
          );
        })}
      </div>
    </AdminPage>
  );
}
