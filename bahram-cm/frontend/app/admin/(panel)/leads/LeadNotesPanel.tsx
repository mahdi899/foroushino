'use client';

import { useState } from 'react';
import { Check, Loader2, MessageSquarePlus, Pencil, Trash2, X } from 'lucide-react';
import { addLeadNote, deleteLeadNote, updateLeadNote, type LeadNoteItem } from './actions';

function formatNoteDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function LeadNotesPanel({
  leadId,
  initialNotes,
}: {
  leadId: number;
  initialNotes: LeadNoteItem[];
}) {
  const [notes, setNotes] = useState<LeadNoteItem[]>(
    [...initialNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  );
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [busy, setBusy] = useState<'add' | number | null>(null);
  const [error, setError] = useState('');

  async function handleAdd() {
    const text = draft.trim();
    if (!text) return;
    setError('');
    setBusy('add');
    const res = await addLeadNote(leadId, text);
    setBusy(null);
    if (!res.ok || !res.note) {
      setError(res.error ?? 'خطا در ثبت یادداشت');
      return;
    }
    setNotes((prev) => [res.note!, ...prev]);
    setDraft('');
  }

  function startEdit(note: LeadNoteItem) {
    setEditingId(note.id);
    setEditDraft(note.note);
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft('');
  }

  async function saveEdit(noteId: number) {
    const text = editDraft.trim();
    if (!text) return;
    setError('');
    setBusy(noteId);
    const res = await updateLeadNote(leadId, noteId, text);
    setBusy(null);
    if (!res.ok || !res.note) {
      setError(res.error ?? 'خطا در ویرایش');
      return;
    }
    setNotes((prev) => prev.map((n) => (n.id === noteId ? res.note! : n)));
    cancelEdit();
  }

  async function handleDelete(note: LeadNoteItem) {
    if (!window.confirm('این یادداشت حذف شود؟')) return;
    setError('');
    setBusy(note.id);
    const res = await deleteLeadNote(leadId, note.id);
    setBusy(null);
    if (!res.ok) {
      setError(res.error ?? 'خطا در حذف');
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    if (editingId === note.id) cancelEdit();
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquarePlus className="h-4 w-4 text-primary" />
        <p className="text-small font-semibold text-primary-dark">یادداشت‌های داخلی</p>
        {notes.length > 0 && (
          <span className="rounded-pill bg-primary-soft/60 px-2 py-0.5 admin-text-meta font-medium text-primary">
            {notes.length}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="field-input min-h-[72px] resize-y text-small"
          placeholder="یادداشت جدید برای پیگیری این لید…"
          rows={2}
          disabled={busy === 'add'}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy === 'add' || !draft.trim()}
          className="btn btn-primary w-full justify-center px-3 py-2 text-caption sm:w-auto"
        >
          {busy === 'add' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'افزودن یادداشت'}
        </button>
      </div>

      {error && <p className="mt-3 text-caption text-error">{error}</p>}

      {notes.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border bg-surface-soft/50 px-3 py-4 text-center text-caption text-text-muted">
          هنوز یادداشتی ثبت نشده. برای پیگیری تماس یا نتیجه، یادداشت اضافه کنید.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {notes.map((note) => {
            const isEditing = editingId === note.id;
            const isBusy = busy === note.id;

            return (
              <li
                key={note.id}
                className="group rounded-lg border border-border bg-surface-soft/40 p-3 transition hover:border-accent/40"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      className="field-input min-h-[72px] resize-y text-small"
                      rows={3}
                      autoFocus
                      disabled={isBusy}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(note.id)}
                        disabled={isBusy || !editDraft.trim()}
                        className="btn btn-primary px-3 py-1.5 text-caption"
                      >
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        ذخیره
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isBusy}
                        className="btn btn-secondary px-3 py-1.5 text-caption"
                      >
                        <X className="h-3.5 w-3.5" />
                        انصراف
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <p className="whitespace-pre-wrap text-small leading-6 text-text">{note.note}</p>
                      <div className="flex shrink-0 gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startEdit(note)}
                          className="btn btn-ghost px-2 py-1.5 text-text-muted hover:text-primary"
                          title="ویرایش"
                          disabled={busy !== null}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(note)}
                          className="btn btn-ghost px-2 py-1.5 text-text-muted hover:text-error"
                          title="حذف"
                          disabled={busy !== null}
                        >
                          {isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 admin-text-meta text-text-muted">{formatNoteDate(note.createdAt)}</p>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
