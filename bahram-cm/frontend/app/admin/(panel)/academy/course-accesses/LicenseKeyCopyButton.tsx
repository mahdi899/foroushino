'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function LicenseKeyCopyButton({ licenseKey }: { licenseKey: string | null | undefined }) {
  const [copied, setCopied] = useState(false);

  if (!licenseKey?.trim()) {
    return <span className="text-caption text-text-muted">—</span>;
  }

  async function copy() {
    await navigator.clipboard.writeText(licenseKey!.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface px-3 py-1.5 text-caption font-medium text-text-muted transition hover:border-primary/30 hover:text-primary"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'کپی شد' : 'کپی لایسنس'}
    </button>
  );
}
