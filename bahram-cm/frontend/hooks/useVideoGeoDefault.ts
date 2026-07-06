'use client';

import { useEffect, useRef, useState } from 'react';
import type { VideoSource } from '@/lib/article/videoEmbed';

const GEO_CACHE_KEY = 'atrin_video_geo';

function readGeoCache(): 'IR' | 'non-IR' | null {
  if (typeof sessionStorage === 'undefined') return null;
  const value = sessionStorage.getItem(GEO_CACHE_KEY);
  if (value === 'IR' || value === 'non-IR') return value;
  return null;
}

/** Deferred geo hint: IR → aparat first, otherwise YouTube. Never blocks first paint. */
export function useVideoGeoDefault(enabled: boolean) {
  const [defaultSource, setDefaultSource] = useState<VideoSource>(() => {
    const cached = readGeoCache();
    if (cached === 'IR') return 'aparat';
    if (cached === 'non-IR') return 'youtube';
    return 'aparat';
  });

  useEffect(() => {
    if (!enabled) return;
    const cached = readGeoCache();
    if (cached) {
      setDefaultSource(cached === 'IR' ? 'aparat' : 'youtube');
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch('/api/geo/country', { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { country?: string | null } | null) => {
          const code = data?.country;
          if (!code) return;
          const isIran = code === 'IR';
          sessionStorage.setItem(GEO_CACHE_KEY, isIran ? 'IR' : 'non-IR');
          setDefaultSource(isIran ? 'aparat' : 'youtube');
        })
        .catch(() => {
          /* keep aparat default for Persian site */
        });
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled]);

  return defaultSource;
}

export function useVideoSourceWithGeo(
  showSwitch: boolean,
  fallback: VideoSource,
  geoDefault: VideoSource,
) {
  const userPickedRef = useRef(false);
  const [source, setSource] = useState<VideoSource>(() => (showSwitch ? geoDefault : fallback));

  useEffect(() => {
    if (!showSwitch || userPickedRef.current) return;
    setSource(geoDefault);
  }, [showSwitch, geoDefault]);

  function pick(next: 'youtube' | 'aparat') {
    userPickedRef.current = true;
    setSource(next);
  }

  return { source, pick };
}
