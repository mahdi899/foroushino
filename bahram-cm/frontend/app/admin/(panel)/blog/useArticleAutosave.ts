'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ARTICLE_AUTOSAVE_DEBOUNCE_MS,
  hashRevisionSnapshot,
  type ArticleRevisionSnapshot,
} from '@/lib/admin/articleRevisions';
import { createArticleRevision } from './revisionActions';

interface UseArticleAutosaveOptions {
  articleId: number | null;
  enabled: boolean;
  contentKey: string;
  getSnapshot: () => ArticleRevisionSnapshot;
  onSaved?: () => void;
}

export function useArticleAutosave({
  articleId,
  enabled,
  contentKey,
  getSnapshot,
  onSaved,
}: UseArticleAutosaveOptions) {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;

  const lastSavedHashRef = useRef<string | null>(null);
  const baselineSetRef = useRef(false);
  const debounceRef = useRef<number | null>(null);
  const savingRef = useRef(false);

  const runAutosave = useCallback(async () => {
    if (!articleId || !enabled || savingRef.current) return;

    const snapshot = getSnapshotRef.current();
    const hash = hashRevisionSnapshot(snapshot);
    if (hash === lastSavedHashRef.current) return;

    savingRef.current = true;
    setSaving(true);
    const label = `ذخیره خودکار — ${new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`;
    const res = await createArticleRevision(articleId, snapshot, label);
    if (res.ok && res.revision) {
      lastSavedHashRef.current = hash;
      setLastSavedAt(new Date());
      onSaved?.();
    }
    savingRef.current = false;
    setSaving(false);
  }, [articleId, enabled, onSaved]);

  useEffect(() => {
    lastSavedHashRef.current = null;
    baselineSetRef.current = false;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [articleId]);

  useEffect(() => {
    if (!articleId || !enabled || !contentKey) return;

    if (!baselineSetRef.current) {
      baselineSetRef.current = true;
      lastSavedHashRef.current = contentKey;
      return;
    }

    if (contentKey === lastSavedHashRef.current) return;

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      void runAutosave();
    }, ARTICLE_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [articleId, enabled, contentKey, runAutosave]);

  return { lastSavedAt, saving, runAutosave };
}
