import { cn } from '@/lib/utils';
import type { VideoSource } from '@/lib/article/videoEmbed';

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12 9.6 15.6Z"
      />
    </svg>
  );
}

function AparatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M10.2 8.4v7.2L16.8 12 10.2 8.4ZM6 8.8c0-.7.6-1.2 1.3-1.2h9.4c.7 0 1.3.5 1.3 1.2v6.4c0 .7-.6 1.2-1.3 1.2H7.3c-.7 0-1.3-.5-1.3-1.2V8.8Z"
      />
    </svg>
  );
}

interface VideoPlatformSwitchProps {
  source: VideoSource;
  onPick: (source: 'youtube' | 'aparat') => void;
  className?: string;
}

export function VideoPlatformSwitch({ source, onPick, className }: VideoPlatformSwitchProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)} role="tablist" aria-label="منبع پخش ویدیو">
      <span className="text-[10px] font-medium text-text-muted/70">منبع</span>
      <div className="inline-flex items-center gap-px rounded-md bg-black/[0.04] p-0.5">
        <button
          type="button"
          role="tab"
          aria-selected={source === 'aparat'}
          aria-label="پخش از آپارات"
          title="آپارات"
          onClick={() => onPick('aparat')}
          className={cn(
            'flex h-6 items-center gap-1 rounded-[5px] px-2 text-[10px] font-semibold transition-all duration-150',
            source === 'aparat'
              ? 'bg-[#ea1443] text-white shadow-[0_1px_2px_rgba(234,20,67,0.35)]'
              : 'text-text-muted hover:bg-white/70 hover:text-text',
          )}
        >
          <AparatIcon className="h-3 w-3 shrink-0" />
          <span>Aparat</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={source === 'youtube'}
          aria-label="پخش از YouTube"
          title="YouTube"
          onClick={() => onPick('youtube')}
          className={cn(
            'flex h-6 items-center gap-1 rounded-[5px] px-2 text-[10px] font-semibold transition-all duration-150',
            source === 'youtube'
              ? 'bg-[#ff0000] text-white shadow-[0_1px_2px_rgba(255,0,0,0.3)]'
              : 'text-text-muted hover:bg-white/70 hover:text-text',
          )}
        >
          <YoutubeIcon className="h-3 w-3 shrink-0" />
          <span>Youtube</span>
        </button>
      </div>
    </div>
  );
}
