'use client';

import { useCallback, useEffect, useState } from 'react';
import { GitBranch, Loader2, RotateCcw, Save, Trash2, X } from 'lucide-react';
import {
  ARTICLE_MAX_AUTOSAVES,
  formatRevisionTime,
  type ApiArticleRevision,
  type ArticleRevisionSnapshot,
} from '@/lib/admin/articleRevisions';
import {
  createArticleRevision,
  deleteArticleRevision,
  getArticleRevision,
  listArticleRevisions,
} from './revisionActions';

interface ArticleRevisionsMenuProps {
  articleId: number | null;
  isDraft: boolean;
  getSnapshot: () => ArticleRevisionSnapshot;
  lastAutosaveAt: Date | null;
  autosaveSaving: boolean;
  refreshKey?: number;
  onRestore: (snapshot: ArticleRevisionSnapshot) => void;
  onRevisionSaved?: () => void;
}

export function ArticleRevisionsMenu({
  articleId,
  isDraft,
  getSnapshot,
  lastAutosaveAt,
  autosaveSaving,
  refreshKey,
  onRestore,
  onRevisionSaved,
}: ArticleRevisionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<ApiArticleRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [commitMsg, setCommitMsg] = useState('');
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState('');
  const [commitSuccess, setCommitSuccess] = useState('');
  const [restoreError, setRestoreError] = useState('');

  const load = useCallback(async () => {
    if (!articleId || !isDraft) {
      setRevisions([]);
      return;
    }
    setLoading(true);
    const data = await listArticleRevisions(articleId);
    setRevisions(data);
    setLoading(false);
  }, [articleId, isDraft]);

  useEffect(() => {
    if (!articleId || !isDraft) {
      setRevisions([]);
      return;
    }
    load();
  }, [articleId, isDraft, refreshKey, load]);

  useEffect(() => {
    if (!open) return;
    setCommitError('');
    setCommitSuccess('');
    setRestoreError('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function handleManualCommit() {
    if (!articleId || !isDraft) return;
    setCommitting(true);
    setCommitError('');
    setCommitSuccess('');
    const time = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    const label = commitMsg.trim() || `نسخه دستی — ${time}`;
    const res = await createArticleRevision(articleId, getSnapshot(), label, { force: true });
    setCommitting(false);
    if (res.ok && res.revision) {
      setCommitMsg('');
      setCommitSuccess(`نسخه #${res.revision.revision_number} ثبت شد.`);
      setRevisions((prev) => [res.revision!, ...prev.filter((r) => r.id !== res.revision!.id)]);
      onRevisionSaved?.();
    } else if (res.skipped) {
      setCommitError(res.message ?? 'ثبت نسخه انجام نشد.');
    } else {
      setCommitError(res.message ?? 'ثبت نسخه ناموفق بود.');
    }
  }

  async function handleRestore(revisionId: number) {
    if (!articleId) return;
    if (!confirm('محتوای این نسخه جایگزین ویرایش فعلی شود؟ (تا «ذخیره» نزنید، روی سایت اعمال نمی‌شود)')) return;
    setBusyId(revisionId);
    setRestoreError('');
    const rev = await getArticleRevision(articleId, revisionId);
    if (rev?.snapshot && Object.keys(rev.snapshot).length > 0) {
      onRestore(rev.snapshot);
      setOpen(false);
    } else {
      setRestoreError('بازیابی ناموفق — snapshot این نسخه در دسترس نیست.');
    }
    setBusyId(null);
  }

  async function handleDelete(revisionId: number) {
    if (!articleId || !confirm('این نسخه حذف شود؟')) return;
    setBusyId(revisionId);
    await deleteArticleRevision(articleId, revisionId);
    await load();
    setBusyId(null);
  }

  const canUse = Boolean(articleId && isDraft);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-secondary admin-toolbar-btn"
        title="تاریخچه نسخه‌ها"
      >
        <GitBranch className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">نسخه‌ها</span>
        {canUse && revisions.length > 0 && (
          <span className="mr-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {revisions.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[75] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 admin-overlay" onClick={() => setOpen(false)} />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-floating">
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <p className="flex items-center gap-2 font-semibold text-primary-dark">
                  <GitBranch className="h-4 w-4" />
                  تاریخچه نسخه‌ها
                </p>
                <p className="mt-0.5 text-caption text-text-muted">
                  {canUse
                    ? `حداکثر ${ARTICLE_MAX_AUTOSAVES} autosave — نسخه‌های دستی جدا نگه داشته می‌شوند`
                    : !articleId
                      ? 'پس از اولین ذخیره فعال می‌شود'
                      : 'فقط برای پیش‌نویس — با انتشار پاک می‌شود'}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-text-muted hover:bg-surface-soft">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {canUse && (
                <div className="mb-4 rounded-lg border border-border bg-surface-soft/50 p-3">
                  <p className="mb-2 text-caption font-semibold text-primary-dark">ثبت نسخه (مثل Git commit)</p>
                  <input
                    className="field-input mb-2 text-small"
                    placeholder="پیام نسخه — مثلاً: اصلاح مقدمه و SEO"
                    value={commitMsg}
                    onChange={(e) => setCommitMsg(e.target.value)}
                    disabled={committing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleManualCommit();
                      }
                    }}
                  />
                  {commitError && <p className="mb-2 text-caption text-error">{commitError}</p>}
                  {commitSuccess && <p className="mb-2 text-caption text-success">{commitSuccess}</p>}
                  <button
                    type="button"
                    onClick={handleManualCommit}
                    disabled={committing}
                    className="btn btn-primary w-full px-3 py-2 text-caption"
                  >
                    {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    ثبت
                  </button>
                  <p className="mt-2 text-[10px] text-text-muted">
                    نسخه در همین لیست پایین ذخیره می‌شود — دکمه «ذخیره» بالا فقط مقاله را روی سایت می‌نویسد.
                  </p>
                  <p className="mt-1 text-[10px] text-text-muted">
                    {autosaveSaving ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> autosave…
                      </span>
                    ) : lastAutosaveAt ? (
                      `آخرین autosave: ${formatRevisionTime(lastAutosaveAt.toISOString())}`
                    ) : (
                      'autosave ~۳۰ ثانیه پس از توقف ویرایش'
                    )}
                  </p>
                </div>
              )}

              {!articleId && (
                <p className="py-6 text-center text-small text-text-muted">
                  ابتدا مقاله را یک‌بار «ذخیره» کنید تا نسخه‌بندی فعال شود.
                </p>
              )}

              {articleId && !isDraft && (
                <p className="py-6 text-center text-small text-text-muted">
                  مقاله منتشر شده — تاریخچه نسخه‌ها حذف شده است.
                </p>
              )}

              {canUse && (
                <>
                  {restoreError && <p className="mb-3 text-caption text-error">{restoreError}</p>}
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                    </div>
                  ) : revisions.length === 0 ? (
                    <p className="py-4 text-center text-caption text-text-muted">هنوز نسخه‌ای ثبت نشده.</p>
                  ) : (
                    <ul className="space-y-2">
                      {revisions.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-soft/40 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-small font-medium text-text">
                              #{r.revision_number} {r.label}
                            </p>
                            <p className="text-caption text-text-muted">{formatRevisionTime(r.created_at)}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              title="بازیابی در ویرایشگر"
                              disabled={busyId === r.id}
                              onClick={() => handleRestore(r.id)}
                              className="btn btn-secondary px-2 py-1"
                            >
                              {busyId === r.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              title="حذف"
                              disabled={busyId === r.id}
                              onClick={() => handleDelete(r.id)}
                              className="btn btn-secondary px-2 py-1 text-error"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-border px-5 py-3">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary w-full px-4 py-2 text-small">
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
