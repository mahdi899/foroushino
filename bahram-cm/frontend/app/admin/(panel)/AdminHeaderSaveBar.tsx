'use client';

import { Loader2, Save } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdminSaveBarContext } from './AdminSaveBarContext';

export function AdminHeaderSaveBar() {
  const { bar } = useAdminSaveBarContext();

  return (
    <AnimatePresence>
      {bar?.dirty ? (
        <motion.div
          key="admin-header-save-bar"
          initial={{ opacity: 0, y: -8, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-end gap-1"
        >
          <button
            type="button"
            disabled={bar.saving}
            onClick={() => void bar.onSave()}
            className="admin-header-save-bar btn btn-primary px-3 py-1.5 text-caption shadow-soft"
          >
            {bar.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {bar.saving ? 'در حال ذخیره…' : bar.label ?? 'ذخیره تغییرات'}
          </button>
          {bar.message ? (
            <p
              className={`max-w-[11rem] truncate text-end admin-text-caption leading-snug ${
                bar.messageTone === 'error' ? 'text-error' : 'text-success'
              }`}
            >
              {bar.message}
            </p>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
