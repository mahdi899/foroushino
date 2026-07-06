'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import {
  aparatEmbedUrl,
  hasVideoSwitch,
  resolveActiveSource,
  youtubeEmbedUrl,
  type ArticleVideoAttrs,
} from '@/lib/article/videoEmbed';
import { VideoPlatformSwitch } from '@/components/blog/VideoPlatformSwitch';
import { VideoEmbedFrame } from '@/components/blog/VideoEmbedFrame';
import { useVideoGeoDefault, useVideoSourceWithGeo } from '@/hooks/useVideoGeoDefault';

interface ArticleVideoEmbedProps extends ArticleVideoAttrs {
  className?: string;
  /** Admin editor: mount player immediately without waiting for scroll. */
  eager?: boolean;
}

export function ArticleVideoEmbed({ youtube, aparat, direct, active, className, eager = false }: ArticleVideoEmbedProps) {
  const attrs = useMemo(() => ({ youtube, aparat, direct, active }), [youtube, aparat, direct, active]);
  const showSwitch = hasVideoSwitch(attrs);
  const geoDefault = useVideoGeoDefault(showSwitch);
  const storedActive = resolveActiveSource(attrs);
  const { source, pick } = useVideoSourceWithGeo(showSwitch, storedActive, geoDefault);
  const resolvedSource = showSwitch ? source : storedActive;

  const embed =
    resolvedSource === 'youtube' && youtube
      ? { kind: 'iframe' as const, src: youtubeEmbedUrl(youtube), title: 'YouTube video', allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' }
      : resolvedSource === 'aparat' && aparat
        ? { kind: 'iframe' as const, src: aparatEmbedUrl(aparat), title: 'Aparat video' }
        : resolvedSource === 'direct' && direct
          ? { kind: 'video' as const, src: resolveMediaUrl(direct), title: 'Video' }
          : null;

  return (
    <figure className={cn('atrin-video-embed my-6', className)}>
      <div className="overflow-hidden rounded-xl border border-border bg-primary-dark/5 shadow-sm">
        {embed ? (
          <VideoEmbedFrame
            key={`${resolvedSource}-${embed.src}`}
            kind={embed.kind}
            src={embed.src}
            title={embed.title}
            eager={eager}
            iframeAllow={'allow' in embed ? embed.allow : undefined}
          />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-surface-soft text-caption text-text-muted">
            ویدیو در دسترس نیست
          </div>
        )}
        {showSwitch && (
          <div className="flex items-center px-2.5 py-1.5" dir="ltr">
            <VideoPlatformSwitch source={source} onPick={pick} />
          </div>
        )}
      </div>
    </figure>
  );
}
