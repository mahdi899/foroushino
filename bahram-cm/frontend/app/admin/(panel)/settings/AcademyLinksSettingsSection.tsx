'use client';

import { useEffect, useState } from 'react';
import { Link2, Loader2, Save } from 'lucide-react';
import { loadAcademyLinksSettings, saveAcademyLinksSettings } from './actions';

type AcademyLinksForm = {
  telegram_channel_url: string;
  rubika_channel_url: string;
  telegram_bot_url: string;
};

const EMPTY_FORM: AcademyLinksForm = {
  telegram_channel_url: '',
  rubika_channel_url: '',
  telegram_bot_url: '',
};

export function AcademyLinksSettingsSection() {
  const [form, setForm] = useState<AcademyLinksForm>(EMPTY_FORM);
  const [baseline, setBaseline] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    void loadAcademyLinksSettings()
      .then((data) => {
        setForm(data);
        setBaseline(JSON.stringify(data));
      })
      .finally(() => setLoading(false));
  }, []);

  const dirty = JSON.stringify(form) !== baseline;

  async function handleSave() {
    setSaving(true);
    setStatus('idle');
    const res = await saveAcademyLinksSettings(form);
    setSaving(false);
    if (res.ok) {
      setBaseline(JSON.stringify(form));
      setStatus('saved');
    } else {
      setStatus('error');
    }
  }

  function field(
    key: keyof AcademyLinksForm,
    label: string,
    placeholder: string,
  ) {
    return (
      <div>
        <label className="field-label">{label}</label>
        <input
          value={form[key]}
          onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
          className="field-input"
          dir="ltr"
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div id="academy-links" className="card space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} />
          <div>
            <h2 className="text-h3 text-primary-dark">لینک‌های چک‌لیست شروع مسیر</h2>
            <p className="mt-1 text-small text-text-muted">
              لینک کانال تلگرام، روبیکا و ربات تلگرام — در داشبورد دانشجو با bottom sheet / پاپ‌آپ نمایش داده می‌شود.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || saving || loading}
          className="btn btn-primary px-4 py-2 text-small disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {status === 'saved' ? 'ذخیره شد' : 'ذخیره لینک‌ها'}
        </button>
      </div>

      {loading ? (
        <p className="text-caption text-text-muted">در حال بارگذاری…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field('telegram_channel_url', 'کانال تلگرام', 'https://t.me/your_channel')}
          {field('rubika_channel_url', 'کانال روبیکا', 'https://rubika.ir/...')}
          {field('telegram_bot_url', 'ربات تلگرام', 'https://t.me/your_bot')}
        </div>
      )}

      {status === 'error' ? (
        <p className="text-caption text-error">ذخیره ناموفق بود. دوباره تلاش کنید.</p>
      ) : null}
    </div>
  );
}
