'use client';

import { useState } from 'react';
import { Loader2, Plus, Save, Trash2, User } from 'lucide-react';
import { ImageUrlField } from '../content/ImageUrlField';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import type { ChatbotOperatorProfile } from '@/lib/chatbot/types';

function newProfileId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface OperatorProfilesSectionProps {
  profiles: ChatbotOperatorProfile[];
  onChange: (profiles: ChatbotOperatorProfile[]) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  saveMsg: string | null;
}

export function OperatorProfilesSection({
  profiles,
  onChange,
  onSave,
  saving,
  saveMsg,
}: OperatorProfilesSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function addProfile() {
    const id = newProfileId();
    onChange([...profiles, { id, name: '', avatar_url: '' }]);
    setExpandedId(id);
  }

  function updateProfile(id: string, patch: Partial<ChatbotOperatorProfile>) {
    onChange(profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removeProfile(id: string) {
    onChange(profiles.filter((p) => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-h3 text-primary-dark">پروفایل اپراتورها</h2>
          <p className="mt-1 text-caption text-text-muted">
            هنگام پاسخ در مکالمات، اپراتور یکی از این پروفایل‌ها را انتخاب می‌کند — نام و عکس برای کاربر
            نمایش داده می‌شود.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="btn btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-small"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره پروفایل‌ها
        </button>
      </div>

      {saveMsg && <p className="text-caption text-text-muted">{saveMsg}</p>}

      {profiles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface-soft/40 p-4 text-small text-text-muted">
          هنوز پروفایلی ساخته نشده. حداقل یک پروفایل با نام و عکس اضافه کنید.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {profiles.map((profile) => {
            const expanded = expandedId === profile.id;
            return (
              <div key={profile.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-surface-soft ring-2 ring-border/60">
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveMediaUrl(profile.avatar_url)}
                        alt={profile.name || 'اپراتور'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-text-muted">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-small font-semibold text-primary-dark">
                      {profile.name || 'بدون نام'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : profile.id)}
                      className="text-[11px] text-accent hover:underline"
                    >
                      {expanded ? 'بستن' : 'ویرایش'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProfile(profile.id)}
                    className="rounded-md p-1.5 text-text-muted transition hover:bg-red-50 hover:text-error"
                    aria-label="حذف پروفایل"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {expanded && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    <div>
                      <label className="field-label">نام نمایشی</label>
                      <input
                        type="text"
                        className="field-input mt-1"
                        value={profile.name}
                        maxLength={80}
                        placeholder="مثلاً سارا — کارشناس مشاوره"
                        onChange={(e) => updateProfile(profile.id, { name: e.target.value })}
                      />
                    </div>
                    <ImageUrlField
                      label="عکس پروفایل"
                      value={profile.avatar_url}
                      onChange={(url) => updateProfile(profile.id, { avatar_url: url })}
                      alt={profile.name || 'اپراتور'}
                      previewClassName="relative mt-2 h-24 w-24 overflow-hidden rounded-full border border-border bg-surface-soft"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={addProfile}
        className="btn btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-small"
      >
        <Plus className="h-4 w-4" />
        افزودن پروفایل
      </button>
    </div>
  );
}
