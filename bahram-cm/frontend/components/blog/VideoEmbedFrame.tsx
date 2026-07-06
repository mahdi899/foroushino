'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const LOAD_HINT_MS = 12_000;

function useInViewOnce(rootMargin = '240px') {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return { ref, visible };
}

interface VideoEmbedFrameProps {
  src: string;
  title: string;
  kind: 'iframe' | 'video';
  eager?: boolean;
  iframeAllow?: string;
}

export function VideoEmbedFrame({ src, title, kind, eager = false, iframeAllow }: VideoEmbedFrameProps) {
  const { ref, visible } = useInViewOnce();
  const shouldMount = eager || visible;
  const [loaded, setLoaded] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setSlowLoad(false);
  }, [src, kind]);

  useEffect(() => {
    if (!shouldMount || loaded) return;
    const timer = window.setTimeout(() => setSlowLoad(true), LOAD_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [shouldMount, loaded, src]);

  return (
    <div ref={ref} className="relative aspect-video bg-primary-dark/[0.04]">
      {(!shouldMount || !loaded) && (
        <div
          className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-2 bg-surface-soft/90 px-4 text-center"
          aria-live="polite"
          aria-busy={!loaded}
        >
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          <p className="text-caption font-medium text-text-muted">در حال بارگذاری ویدیو…</p>
          {slowLoad && (
            <p className="max-w-xs text-[11px] leading-5 text-text-muted/80">
              بارگذاری کمی طول می‌کشد — می‌توانید به خواندن مقاله ادامه دهید.
            </p>
          )}
        </div>
      )}

      {shouldMount && kind === 'iframe' && (
        <iframe
          src={src}
          title={title}
          className={cn(
            'absolute inset-0 h-full w-full transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          loading="lazy"
          allow={iframeAllow}
          allowFullScreen
          onLoad={() => setLoaded(true)}
        />
      )}

      {shouldMount && kind === 'video' && (
        <video
          src={src}
          controls
          playsInline
          preload="none"
          className={cn(
            'absolute inset-0 h-full w-full bg-black object-contain transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          onLoadedData={() => setLoaded(true)}
          onCanPlay={() => setLoaded(true)}
        />
      )}
    </div>
  );
}
