export type MediaOptimizeVariant = {
  preview_url: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
};

export type MediaOptimizePreview = {
  session_id: string;
  original_filename: string;
  original: MediaOptimizeVariant;
  optimized: MediaOptimizeVariant;
  savings_percent: number;
  engine: string;
  engine_note?: string | null;
  converted_to_webp: boolean;
  skip_reason: string | null;
  recommended: 'original' | 'optimized';
};

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function engineLabel(engine: string): string {
  return (
    {
      tinify: 'TinyPNG',
      resmush: 'reSmush.it',
      gd: 'WebP (GD)',
      copy: 'بدون بهبود',
      none: '—',
    }[engine] ?? engine
  );
}
