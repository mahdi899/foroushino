'use client';

import { useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';

type TokenRow = {
  id: number;
  name: string;
  abilities: string[];
  created_by_name: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string | null;
};

type Props = {
  inboundApplicationsUrl: string;
  inboundPingUrl: string;
  tokens: TokenRow[];
};

export function SatIntegrationsClient({ inboundApplicationsUrl, inboundPingUrl, tokens: initial }: Props) {
  const [tokens, setTokens] = useState(initial);
  const [name, setName] = useState('سایت بهرام');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function createToken() {
    setPending(true);
    setError('');
    setCreatedToken(null);
    const res = await fetch('/api/sat/integration-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error || 'ایجاد توکن ناموفق بود.');
      return;
    }
    const plain = json.token?.plain_text ?? json.data?.token?.plain_text;
    setCreatedToken(plain ?? null);
    const listRes = await fetch('/api/sat/integration-tokens');
    const listJson = await listRes.json().catch(() => ({}));
    setTokens(listJson.tokens ?? listJson.data?.tokens ?? tokens);
  }

  async function revoke(id: number) {
    await fetch(`/api/sat/integration-tokens/${id}`, { method: 'DELETE' });
    setTokens((rows) => rows.map((t) => (t.id === id ? { ...t, revoked_at: new Date().toISOString() } : t)));
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gold/15 bg-white/5 p-4">
        <h3 className="font-medium text-gold">آدرس‌های API برای سایت بهرام</h3>
        <p className="mt-2 text-sm text-bone/70">این URLها را در پنل بهرام → درخواست‌های سات وارد کنید.</p>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <span className="text-bone/60">دریافت درخواست پذیرفته‌شده (POST)</span>
            <div className="mt-1 flex items-center gap-2">
              <code className="block flex-1 overflow-x-auto rounded bg-black/30 px-2 py-1 text-xs" dir="ltr">
                {inboundApplicationsUrl}
              </code>
              <button type="button" onClick={() => copy(inboundApplicationsUrl)} className="text-gold">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <span className="text-bone/60">تست اتصال (GET)</span>
            <div className="mt-1 flex items-center gap-2">
              <code className="block flex-1 overflow-x-auto rounded bg-black/30 px-2 py-1 text-xs" dir="ltr">
                {inboundPingUrl}
              </code>
              <button type="button" onClick={() => copy(inboundPingUrl)} className="text-gold">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gold/15 bg-white/5 p-4">
        <h3 className="font-medium text-gold">توکن اتصال</h3>
        <p className="mt-2 text-sm text-bone/70">توکن فقط یک‌بار نمایش داده می‌شود. آن را در پنل بهرام ذخیره کنید.</p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-bone/60">نام اتصال</span>
            <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button type="button" className="btn-primary inline-flex items-center gap-1" disabled={pending} onClick={createToken}>
            <Plus className="h-4 w-4" />
            ایجاد توکن
          </button>
        </div>
        {createdToken ? (
          <div className="mt-4 rounded-lg border border-gold/30 bg-gold/10 p-3 text-sm">
            <p className="text-gold">توکن جدید (فقط همین‌اکنون):</p>
            <code className="mt-2 block break-all text-xs" dir="ltr">{createdToken}</code>
            <button type="button" className="mt-2 text-gold underline" onClick={() => copy(createdToken)}>
              کپی توکن
            </button>
          </div>
        ) : null}
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      </section>

      <section className="rounded-xl border border-gold/15 bg-white/5 p-4">
        <h3 className="font-medium">توکن‌های موجود</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-3 py-2">
              <div>
                <span className="font-medium">{t.name}</span>
                <span className="mr-2 text-bone/50">
                  {t.revoked_at ? '· لغوشده' : t.last_used_at ? '· استفاده‌شده' : '· فعال'}
                </span>
              </div>
              {!t.revoked_at ? (
                <button type="button" onClick={() => revoke(t.id)} className="text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
