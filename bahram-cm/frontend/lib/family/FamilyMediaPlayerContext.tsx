'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  clampSeekPosition,
  cyclePlaybackSpeed,
  type FamilyPlaybackSpeed,
} from '@/lib/family/playback';

export type FamilyNowPlaying = {
  mediaId: number;
  postId: number;
  title: string;
  kind: 'voice' | 'video';
  progress: number;
  duration: number;
  isPlaying: boolean;
};

interface FamilyMediaPlayerContextValue {
  activeId: number | null;
  nowPlaying: FamilyNowPlaying | null;
  playbackRate: FamilyPlaybackSpeed;
  register: (id: number, el: HTMLMediaElement) => void;
  unregister: (id: number) => void;
  requestPlay: (id: number) => void;
  notifyPaused: (id: number) => void;
  setNowPlaying: (info: FamilyNowPlaying | null) => void;
  updateNowPlayingProgress: (mediaId: number, progress: number, duration?: number) => void;
  toggleActivePlayback: () => void;
  seekActiveTo: (position: number) => void;
  setPlaybackRate: (rate: FamilyPlaybackSpeed) => void;
  cyclePlaybackRate: () => void;
  dismissNowPlaying: () => void;
}

const FamilyMediaPlayerContext = createContext<FamilyMediaPlayerContextValue | null>(null);

function applyPlaybackRate(el: HTMLMediaElement, rate: FamilyPlaybackSpeed) {
  el.playbackRate = rate;
  el.defaultPlaybackRate = rate;
}

export function FamilyMediaPlayerProvider({ children }: { children: ReactNode }) {
  const elements = useRef(new Map<number, HTMLMediaElement>());
  const playbackRateRef = useRef<FamilyPlaybackSpeed>(1);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [nowPlaying, setNowPlayingState] = useState<FamilyNowPlaying | null>(null);
  const [playbackRate, setPlaybackRateState] = useState<FamilyPlaybackSpeed>(1);

  playbackRateRef.current = playbackRate;

  useEffect(() => {
    elements.current.forEach((el) => applyPlaybackRate(el, playbackRate));
  }, [playbackRate]);

  const register = useCallback((id: number, el: HTMLMediaElement) => {
    elements.current.set(id, el);
    applyPlaybackRate(el, playbackRateRef.current);
  }, []);

  const unregister = useCallback((id: number) => {
    elements.current.delete(id);
    setNowPlayingState((current) => (current?.mediaId === id ? null : current));
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const requestPlay = useCallback((id: number) => {
    elements.current.forEach((el, elId) => {
      if (elId !== id && !el.paused) el.pause();
    });
    setActiveId(id);
    setNowPlayingState((current) => (current && current.mediaId !== id ? null : current));
    const el = elements.current.get(id);
    if (el) applyPlaybackRate(el, playbackRateRef.current);
  }, []);

  const notifyPaused = useCallback((id: number) => {
    setActiveId((current) => (current === id ? null : current));
    setNowPlayingState((current) =>
      current?.mediaId === id ? { ...current, isPlaying: false } : current,
    );
  }, []);

  const setNowPlaying = useCallback((info: FamilyNowPlaying | null) => {
    setNowPlayingState(info);
    if (info) {
      setActiveId(info.mediaId);
      const el = elements.current.get(info.mediaId);
      if (el) applyPlaybackRate(el, playbackRateRef.current);
    }
  }, []);

  const updateNowPlayingProgress = useCallback((mediaId: number, progress: number, duration?: number) => {
    setNowPlayingState((current) => {
      if (!current || current.mediaId !== mediaId) return current;
      return {
        ...current,
        progress,
        duration: duration && duration > 0 ? duration : current.duration,
      };
    });
  }, []);

  const toggleActivePlayback = useCallback(() => {
    const id = nowPlaying?.mediaId ?? activeId;
    if (id == null) return;
    const el = elements.current.get(id);
    if (!el) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    requestPlay(id);
    void el.play().catch(() => {});
  }, [activeId, nowPlaying, requestPlay]);

  const seekActiveTo = useCallback(
    (position: number) => {
      const id = nowPlaying?.mediaId ?? activeId;
      if (id == null) return;
      const el = elements.current.get(id);
      if (!el) return;

      const duration =
        Number.isFinite(el.duration) && el.duration > 0
          ? el.duration
          : nowPlaying?.duration ?? 0;
      const target = clampSeekPosition(position, duration);

      try {
        el.currentTime = target;
      } catch {
        return;
      }

      updateNowPlayingProgress(id, target, duration > 0 ? duration : undefined);
    },
    [activeId, nowPlaying, updateNowPlayingProgress],
  );

  const setPlaybackRate = useCallback((rate: FamilyPlaybackSpeed) => {
    setPlaybackRateState(rate);
    const id = nowPlaying?.mediaId ?? activeId;
    if (id != null) {
      const el = elements.current.get(id);
      if (el) applyPlaybackRate(el, rate);
    }
  }, [activeId, nowPlaying]);

  const cyclePlaybackRateFn = useCallback(() => {
    const id = nowPlaying?.mediaId ?? activeId;
    const el = id != null ? elements.current.get(id) : undefined;
    const wasPlaying = Boolean(el && !el.paused);

    setPlaybackRateState((current) => {
      const next = cyclePlaybackSpeed(current);
      if (el) {
        applyPlaybackRate(el, next);
        if (wasPlaying) {
          void el.play().catch(() => {});
        }
      }
      return next;
    });
  }, [activeId, nowPlaying]);

  const dismissNowPlaying = useCallback(() => {
    const id = activeId ?? nowPlaying?.mediaId ?? null;
    if (id != null) elements.current.get(id)?.pause();
    setActiveId(null);
    setNowPlayingState(null);
  }, [activeId, nowPlaying]);

  return (
    <FamilyMediaPlayerContext.Provider
      value={{
        activeId,
        nowPlaying,
        playbackRate,
        register,
        unregister,
        requestPlay,
        notifyPaused,
        setNowPlaying,
        updateNowPlayingProgress,
        toggleActivePlayback,
        seekActiveTo,
        setPlaybackRate,
        cyclePlaybackRate: cyclePlaybackRateFn,
        dismissNowPlaying,
      }}
    >
      {children}
    </FamilyMediaPlayerContext.Provider>
  );
}

export function useFamilyMediaPlayer() {
  const ctx = useContext(FamilyMediaPlayerContext);
  if (!ctx) throw new Error('useFamilyMediaPlayer must be used within FamilyMediaPlayerProvider');
  return ctx;
}
