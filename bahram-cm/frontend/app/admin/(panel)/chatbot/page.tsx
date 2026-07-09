'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { Download, Loader2, MessageSquare, Save, Search, Star, Trash2 } from 'lucide-react';
import { AdminPage, Badge, Table } from '../ui';
import { deleteChatbotSessions, exportChatbotLogs, fetchChatbotLogs, fetchChatbotSessions, loadChatbotSettings, saveChatbotConfig } from './actions';
import { useOperatorQueueAlert } from '../OperatorQueueAlertContext';
import { storedToForm } from '@/lib/chatbot/form';
import type { ChatbotExportRow, ChatbotLogEntry, ChatbotOperatorProfile, ChatbotSessionEntry, ChatbotSettingsForm } from '@/lib/chatbot/types';
import { CHATBOT_EXPORT_KIND_LABELS, chatbotLogRating, DEFAULT_CHATBOT_CONFIG } from '@/lib/chatbot/types';
import { SessionOperatorPanel } from './SessionOperatorPanel';
import { OperatorQueuePanel } from './OperatorQueuePanel';
import { OperatorProfilesSection } from './OperatorProfilesSection';
import { QuickSuggestionsSection } from './QuickSuggestionsSection';
import { getChatbotOperatorProfiles, saveChatbotOperatorProfiles } from '@/lib/chatbot/operatorProfiles';

type Tab = 'settings' | 'operator' | 'sessions' | 'logs';

const TAB_LABELS: Record<Tab, string> = {
  settings: 'تنظیمات',
  operator: 'صف اپراتور',
  sessions: 'مکالمات',
  logs: 'پیام‌ها',
};

function LogStars({ rating }: { rating: number | null }) {
  if (!rating) {
    return <span className="text-caption text-text-muted">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" title={`${rating} از ۵`}>
      {Array.from({ length: rating }, (_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-current" strokeWidth={1.5} />
      ))}
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div>
        <p className="text-small font-medium text-primary-dark">{label}</p>
        {hint && <p className="mt-0.5 text-caption text-text-muted">{hint}</p>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 accent-accent"
      />
    </label>
  );
}

export default function ChatbotAdminPage() {
  const [tab, setTab] = useState<Tab>('settings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ChatbotSettingsForm>(() => storedToForm(DEFAULT_CHATBOT_CONFIG));
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [operatorProfiles, setOperatorProfiles] = useState<ChatbotOperatorProfile[]>([]);
  const [profilesSaving, setProfilesSaving] = useState(false);
  const [profilesSaveMsg, setProfilesSaveMsg] = useState<string | null>(null);

  const [logs, setLogs] = useState<ChatbotLogEntry[]>([]);
  const [logMeta, setLogMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [logQ, setLogQ] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<ChatbotSessionEntry[]>([]);
  const [sessionMeta, setSessionMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const { pendingCount, refreshPendingCount } = useOperatorQueueAlert();

  useEffect(() => {
    Promise.all([loadChatbotSettings(), getChatbotOperatorProfiles()])
      .then(([stored, profiles]) => {
        setForm(storedToForm(stored));
        setOperatorProfiles(profiles);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadLogs = useCallback(async (page = 1, q = logQ) => {
    setLogsLoading(true);
    try {
      const res = await fetchChatbotLogs({ page, q });
      setLogs(res.data);
      setLogMeta(res.meta);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [logQ]);

  const loadSessions = useCallback(async (page = 1, q = logQ) => {
    setSessionsLoading(true);
    try {
      const res = await fetchChatbotSessions({ page, q });
      setSessions(res.data);
      setSessionMeta(res.meta);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [logQ]);

  useEffect(() => {
    if (tab === 'logs') void loadLogs(1);
    if (tab === 'sessions') void loadSessions(1);
  }, [tab, loadLogs, loadSessions]);

  async function toggleSessionDetail(sessionId: string) {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }

    setExpandedSession(sessionId);
  }

  async function handleDeleteSelected() {
    if (selectedSessions.size === 0) return;
    if (!confirm(`${selectedSessions.size} مکالمه برای همیشه حذف شود؟`)) return;

    setDeleting(true);
    try {
      await deleteChatbotSessions([...selectedSessions]);
      setSelectedSessions(new Set());
      setExpandedSession(null);
      await loadSessions(sessionMeta.current_page);
    } catch {
      alert('حذف انجام نشد. دوباره تلاش کنید.');
    } finally {
      setDeleting(false);
    }
  }

  function toggleSessionSelected(sessionId: string) {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  const pageSessionIds = sessions.map((s) => s.session_id);
  const allPageSelected =
    pageSessionIds.length > 0 && pageSessionIds.every((id) => selectedSessions.has(id));

  function toggleSelectAllOnPage() {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageSessionIds.forEach((id) => next.delete(id));
      } else {
        pageSessionIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const search = tab === 'logs' || tab === 'sessions' ? logQ : undefined;
      const rows = await exportChatbotLogs(search);
      const header = [
        'id',
        'session_id',
        'kind',
        'kind_label',
        'visitor_first_name',
        'visitor_last_name',
        'visitor_phone',
        'page_url',
        'ip_address',
        'user_message',
        'reply',
        'operator_name',
        'reply_to_log_id',
        'rating',
        'pending_operator',
        'low_rating_followup',
        'rated_stars',
        'has_error',
        'error_code',
        'created_at',
      ];
      const csvCell = (value: string | number | boolean | null | undefined) => {
        if (value === null || value === undefined || value === '') return '';
        if (typeof value === 'boolean') return value ? '1' : '0';
        return `"${String(value).replace(/"/g, '""')}"`;
      };
      const csv = [
        header.join(','),
        ...rows.map((r: ChatbotExportRow) =>
          [
            r.id,
            r.session_id,
            r.kind,
            CHATBOT_EXPORT_KIND_LABELS[r.kind],
            r.visitor_first_name,
            r.visitor_last_name,
            r.visitor_phone,
            r.page_url,
            r.ip_address,
            r.user_message,
            r.reply,
            r.operator_name,
            r.reply_to_log_id,
            r.rating,
            r.pending_operator,
            r.low_rating_followup,
            r.rated_stars,
            r.has_error,
            r.error_code,
            r.created_at,
          ]
            .map(csvCell)
            .join(','),
        ),
      ].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatbot-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleSaveProfiles() {
    setProfilesSaving(true);
    setProfilesSaveMsg(null);
    const res = await saveChatbotOperatorProfiles(
      operatorProfiles.filter((p) => p.name.trim()),
    );
    setProfilesSaving(false);
    setProfilesSaveMsg(res.ok ? 'پروفایل‌ها ذخیره شد.' : res.error ?? 'خطا در ذخیره.');
    setTimeout(() => setProfilesSaveMsg(null), 3000);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    const res = await saveChatbotConfig(form);
    setSaving(false);
    setSaveMsg(res.ok ? 'ذخیره شد.' : res.error ?? 'خطا در ذخیره');
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminPage
      title="چت‌بات هوشمند"
      desc="دستیار AI سایت — تنظیمات، محدودیت نرخ، و گزارش مکالمات"
      action={
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="btn btn-secondary px-4 py-2 text-small"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            خروجی CSV
          </button>
          {tab === 'settings' && (
            <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn btn-primary px-4 py-2 text-small">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ذخیره تنظیمات
            </button>
          )}
        </div>
      }
    >
      <div className="mb-6 flex gap-2 border-b border-border">
        {(['settings', 'operator', 'sessions', 'logs'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`relative border-b-2 px-4 py-2 text-small font-medium transition-colors ${
              tab === t ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {TAB_LABELS[t]}
            {t === 'operator' && pendingCount > 0 && (
              <span className="absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 admin-text-caption font-bold text-white">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {saveMsg && (
        <p className={`mb-4 text-small ${saveMsg.includes('خطا') ? 'text-danger' : 'text-success'}`}>{saveMsg}</p>
      )}

      {tab === 'settings' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-h3 text-primary-dark">عمومی</h2>
            <Toggle
              checked={form.enabled}
              onChange={(enabled) => setForm({ ...form, enabled })}
              label="فعال‌سازی چت‌بات در سایت"
              hint="کلید API را در تنظیمات هوش مصنوعی → چت‌بات سایت تنظیم کنید"
            />
            <Link href="/admin/ai/settings#ai-chatbot" className="inline-flex text-caption text-accent hover:underline">
              رفتن به تنظیمات API چت‌بات →
            </Link>
            <div>
              <label className="field-label" htmlFor="cb-name">نام دستیار</label>
              <input
                id="cb-name"
                className="field-input mt-1"
                value={form.assistantName}
                onChange={(e) => setForm({ ...form, assistantName: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="cb-welcome">پیام خوش‌آمد</label>
              <textarea
                id="cb-welcome"
                rows={3}
                className="field-input mt-1"
                value={form.welcomeMessage}
                onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="cb-extra">دستورالعمل اضافی AI</label>
              <textarea
                id="cb-extra"
                rows={4}
                className="field-input mt-1"
                placeholder="مثلاً: همیشه به اقساط اشاره کن…"
                value={form.systemPromptExtra}
                onChange={(e) => setForm({ ...form, systemPromptExtra: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-h3 text-primary-dark">محدودیت و امنیت</h2>
            <p className="text-caption text-text-muted">عدد ۰ یعنی نامحدود.</p>
            <div>
              <h3 className="mb-2 text-small font-semibold text-primary-dark">محدودیت AI</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="field-label">سؤال / دقیقه</label>
                  <input
                    type="number"
                    min={0}
                    className="field-input mt-1"
                    value={form.rateLimitPerMinute}
                    onChange={(e) => setForm({ ...form, rateLimitPerMinute: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="field-label">سؤال / ساعت (هر session)</label>
                  <input
                    type="number"
                    min={0}
                    className="field-input mt-1"
                    value={form.rateLimitPerHour}
                    onChange={(e) => setForm({ ...form, rateLimitPerHour: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="field-label">سقف کل / ساعت</label>
                  <input
                    type="number"
                    min={0}
                    className="field-input mt-1"
                    value={form.globalHourlyCap}
                    onChange={(e) => setForm({ ...form, globalHourlyCap: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-small font-semibold text-primary-dark">محدودیت اپراتور</h3>
              <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                <div>
                  <label className="field-label">پیام / دقیقه</label>
                  <input
                    type="number"
                    min={0}
                    className="field-input mt-1"
                    value={form.operatorRateLimitPerMinute}
                    onChange={(e) =>
                      setForm({ ...form, operatorRateLimitPerMinute: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="field-label">پیام / ساعت (هر session)</label>
                  <input
                    type="number"
                    min={0}
                    className="field-input mt-1"
                    value={form.operatorRateLimitPerHour}
                    onChange={(e) =>
                      setForm({ ...form, operatorRateLimitPerHour: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>
            <Toggle
              checked={form.requireCaptcha}
              onChange={(requireCaptcha) => setForm({ ...form, requireCaptcha })}
              label="تأیید Captcha / Turnstile"
              hint="جلوگیری از سوءاستفاده ربات‌ها"
            />
            <Toggle
              checked={form.honeypotEnabled}
              onChange={(honeypotEnabled) => setForm({ ...form, honeypotEnabled })}
              label="فیلد Honeypot"
              hint="فیلد مخفی برای شناسایی bot"
            />
            <div>
              <label className="field-label">حداکثر پیام تاریخچه</label>
              <input
                type="number"
                min={2}
                max={20}
                className="field-input mt-1 max-w-[8rem]"
                value={form.maxHistoryMessages}
                onChange={(e) => setForm({ ...form, maxHistoryMessages: Number(e.target.value) })}
              />
            </div>

            <h2 className="pt-2 text-h3 text-primary-dark">دکمه‌های CTA</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle checked={form.ctaConsultation} onChange={(v) => setForm({ ...form, ctaConsultation: v })} label="مشاوره رایگان" />
              <Toggle checked={form.ctaPricing} onChange={(v) => setForm({ ...form, ctaPricing: v })} label="قیمت‌ها" />
              <Toggle checked={form.ctaWhatsapp} onChange={(v) => setForm({ ...form, ctaWhatsapp: v })} label="واتساپ" />
              <Toggle checked={form.ctaPhone} onChange={(v) => setForm({ ...form, ctaPhone: v })} label="تماس" />
            </div>
          </div>

          <QuickSuggestionsSection
            suggestions={form.quickSuggestions}
            onChange={(quickSuggestions) => setForm({ ...form, quickSuggestions })}
          />

          <div className="mt-8 border-t border-border pt-8 lg:col-span-2">
            <OperatorProfilesSection
              profiles={operatorProfiles}
              onChange={setOperatorProfiles}
              onSave={handleSaveProfiles}
              saving={profilesSaving}
              saveMsg={profilesSaveMsg}
            />
          </div>
        </div>
      ) : tab === 'operator' ? (
        <OperatorQueuePanel
          operatorProfiles={operatorProfiles}
          onQueueChanged={() => void refreshPendingCount()}
        />
      ) : tab === 'sessions' ? (
        <div>
          <p className="mb-4 text-caption text-text-muted">
            مکالمات قدیمی‌تر از ۶۰ روز به‌صورت خودکار و کامل حذف می‌شوند.
          </p>
          <form
            className="mb-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void loadSessions(1, logQ);
            }}
          >
            <input
              className="field-input flex-1"
              placeholder="جستجو session یا IP…"
              value={logQ}
              onChange={(e) => setLogQ(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary px-4 py-2 text-small">
              <Search className="h-4 w-4" />
            </button>
          </form>
          {sessionsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-caption text-text-muted">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-accent"
                    checked={allPageSelected}
                    onChange={toggleSelectAllOnPage}
                    disabled={sessions.length === 0}
                  />
                  انتخاب همه در این صفحه
                  {selectedSessions.size > 0 && (
                    <span className="text-accent">({selectedSessions.size} انتخاب‌شده)</span>
                  )}
                </label>
                {selectedSessions.size > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteSelected()}
                    disabled={deleting}
                    className="btn btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-caption text-danger"
                  >
                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    حذف انتخاب‌شده‌ها
                  </button>
                )}
              </div>
              <Table head={['', 'آخرین فعالیت', 'نام', 'IP', 'شماره تماس', 'اولین باز', 'تعداد پیام', '']}>
                {sessions.map((s) => (
                  <Fragment key={s.session_id}>
                    <tr className={selectedSessions.has(s.session_id) ? 'bg-accent-soft/20' : 'hover:bg-surface-soft/40'}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-accent"
                          checked={selectedSessions.has(s.session_id)}
                          onChange={() => toggleSessionSelected(s.session_id)}
                          aria-label="انتخاب مکالمه"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-caption">
                        {s.last_activity_at ? new Date(s.last_activity_at).toLocaleString('fa-IR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-caption">{s.visitor_name ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-caption">{s.ip_address ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-caption" dir="ltr">
                        {s.visitor_phone ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-caption">
                        {s.opened_at ? new Date(s.opened_at).toLocaleString('fa-IR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-caption">{s.message_count}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-caption text-accent hover:underline"
                          onClick={() => void toggleSessionDetail(s.session_id)}
                        >
                          {expandedSession === s.session_id ? 'بستن' : 'مشاهده'}
                        </button>
                      </td>
                    </tr>
                    {expandedSession === s.session_id && (
                      <tr className="bg-surface-soft/30">
                        <td colSpan={8} className="px-4 py-4">
                          <SessionOperatorPanel
                            sessionId={s.session_id}
                            visitorPhone={s.visitor_phone}
                            visitorName={s.visitor_name}
                            operatorProfiles={operatorProfiles}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </Table>
              <div className="mt-4 flex items-center justify-between text-caption text-text-muted">
                <span>{sessionMeta.total} مکالمه</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={sessionMeta.current_page <= 1}
                    className="btn btn-secondary py-1 text-caption disabled:opacity-40"
                    onClick={() => void loadSessions(sessionMeta.current_page - 1)}
                  >
                    قبلی
                  </button>
                  <span>
                    {sessionMeta.current_page} / {sessionMeta.last_page}
                  </span>
                  <button
                    type="button"
                    disabled={sessionMeta.current_page >= sessionMeta.last_page}
                    className="btn btn-secondary py-1 text-caption disabled:opacity-40"
                    onClick={() => void loadSessions(sessionMeta.current_page + 1)}
                  >
                    بعدی
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div>
          <p className="mb-4 text-caption text-text-muted">
            مکالمات قدیمی‌تر از ۶۰ روز به‌صورت خودکار و کامل حذف می‌شوند.
          </p>
          <form
            className="mb-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void loadLogs(1, logQ);
            }}
          >
            <input
              className="field-input flex-1"
              placeholder="جستجو در سؤال، پاسخ یا session…"
              value={logQ}
              onChange={(e) => setLogQ(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary px-4 py-2 text-small">
              <Search className="h-4 w-4" />
              جستجو
            </button>
          </form>

          {logsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 py-16 text-text-muted">
              <MessageSquare className="h-10 w-10 opacity-40" />
              <p>هنوز مکالمه‌ای ثبت نشده.</p>
            </div>
          ) : (
            <>
              <Table head={['زمان', 'IP', 'سؤال', 'امتیاز', '']}>
                {logs.map((log) => (
                  <Fragment key={log.id}>
                    <tr className="hover:bg-surface-soft/40">
                      <td className="whitespace-nowrap px-4 py-3 text-caption text-text-muted">
                        {log.created_at ? new Date(log.created_at).toLocaleString('fa-IR') : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-caption">{log.ip_address ?? '—'}</td>
                      <td className="max-w-md truncate px-4 py-3">
                        {log.metadata?.error ? (
                          <span className="text-danger">{log.question}</span>
                        ) : (
                          log.question
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <LogStars rating={chatbotLogRating(log.metadata)} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-caption text-accent hover:underline"
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        >
                          {expandedId === log.id ? 'بستن' : 'جزئیات'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr className="bg-surface-soft/30">
                        <td colSpan={5} className="space-y-3 px-4 py-4">
                          <div>
                            <Badge tone="accent">سؤال کاربر</Badge>
                            <p className="mt-2 whitespace-pre-wrap text-small">{log.question}</p>
                          </div>
                          <div>
                            <Badge tone={log.metadata?.error ? 'warning' : 'success'}>
                              {log.metadata?.error ? 'خطا / بدون پاسخ' : 'پاسخ چت‌بات'}
                            </Badge>
                            <p className="mt-2 whitespace-pre-wrap text-small">{log.answer}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-caption text-text-muted">امتیاز کاربر:</span>
                            <LogStars rating={chatbotLogRating(log.metadata)} />
                          </div>
                          <p className="text-caption text-text-muted">Session: {log.session_id}</p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </Table>
              <div className="mt-4 flex items-center justify-between text-caption text-text-muted">
                <span>{logMeta.total} مکالمه</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={logMeta.current_page <= 1}
                    className="btn btn-secondary py-1 text-caption disabled:opacity-40"
                    onClick={() => void loadLogs(logMeta.current_page - 1)}
                  >
                    قبلی
                  </button>
                  <span>
                    {logMeta.current_page} / {logMeta.last_page}
                  </span>
                  <button
                    type="button"
                    disabled={logMeta.current_page >= logMeta.last_page}
                    className="btn btn-secondary py-1 text-caption disabled:opacity-40"
                    onClick={() => void loadLogs(logMeta.current_page + 1)}
                  >
                    بعدی
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </AdminPage>
  );
}
