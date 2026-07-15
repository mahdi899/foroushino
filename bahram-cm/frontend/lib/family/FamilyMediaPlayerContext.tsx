'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export type FamilyNowPlaying = {
  mediaId: number;
  postId: number;
  title: string;
  kind: 'voice' | 'video';
  progress: number;
  duration: number;
};

interface FamilyMediaPlayerContextValue {
  activeId: number | null;
  nowPlaying: FamilyNowPlaying | null;
  register: (id: number, el: HTMLMediaElement) => void;
  unregister: (id: number) => void;
  requestPlay: (id: number) => void;
  notifyPaused: (id: number) => void;
  setNowPlaying: (info: FamilyNowPlaying | null) => void;
  updateNowPlayingProgress: (mediaId: number, progress: number, duration?: number) => void;
  pauseActive: () => void;
}

const FamilyMediaPlayerContext = createContext<FamilyMediaPlayerContextValue | null>(null);

export function FamilyMediaPlayerProvider({ children }: { children: ReactNode }) {
  const elements = useRef(new Map<number, HTMLMediaElement>());
  const [activeId, setActiveId] = useState<number | null>(null);
  const [nowPlaying, setNowPlayingState] = useState<FamilyNowPlaying | null>(null);

  const register = useCallback((id: number, el: HTMLMediaElement) => {
    elements.current.set(id, el);
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
  }, []);

  const notifyPaused = useCallback((id: number) => {
    setActiveId((current) => (current === id ? null : current));
    setNowPlayingState((current) => (current?.mediaId === id ? null : current));
  }, []);

  const setNowPlaying = useCallback((info: FamilyNowPlaying | null) => {
    setNowPlayingState(info);
    if (info) setActiveId(info.mediaId);
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

  const pauseActive = useCallback(() => {
    const id = activeId ?? nowPlaying?.mediaId ?? null;
    if (id == null) return;
    elements.current.get(id)?.pause();
  }, [activeId, nowPlaying]);

  return (
    <FamilyMediaPlayerContext.Provider
      value={{
        activeId,
        nowPlaying,
        register,
        unregister,
        requestPlay,
        notifyPaused,
        setNowPlaying,
        updateNowPlayingProgress,
        pauseActive,
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
