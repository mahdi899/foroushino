'use client';

import { Download } from 'lucide-react';
import { cn } from '@/lib/cn';
import { downloadFamilyMedia } from '@/lib/family/mediaCache';

export function FamilyMediaDownloadButton({
  url,
  mediaId,
  filename,
  className,
  label = 'دانلود',
}: {
  url: string;
  mediaId: number;
  filename?: string;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur-md transition hover:bg-black/65 active:scale-95',
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        void downloadFamilyMedia(url, mediaId, filename);
      }}
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
