'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

/**
 * Telegram-style single-voice playback: starting one voice/video message
 * pauses any other that is currently playing. Holds a registry of media
 * elements keyed by block id rather than React state, to avoid re-rendering
 * the whole feed on every play/pause tick.
 */
interface FamilyMediaPlayerContextValue {
  activeId: number | null;
  register: (id: number, el: HTMLMediaElement) => void;
  unregister: (id: number) => void;
  requestPlay: (id: number) => void;
  notifyPaused: (id: number) => void;
}

const FamilyMediaPlayerContext = createContext<FamilyMediaPlayerContextValue | null>(null);

export function FamilyMediaPlayerProvider({ children }: { children: ReactNode }) {
  const elements = useRef(new Map<number, HTMLMediaElement>());
  const [activeId, setActiveId] = useState<number | null>(null);

  const register = useCallback((id: number, el: HTMLMediaElement) => {
    elements.current.set(id, el);
  }, []);

  const unregister = useCallback((id: number) => {
    elements.current.delete(id);
  }, []);

  const requestPlay = useCallback((id: number) => {
    elements.current.forEach((el, elId) => {
      if (elId !== id && !el.paused) el.pause();
    });
    setActiveId(id);
  }, []);

  const notifyPaused = useCallback((id: number) => {
    setActiveId((current) => (current === id ? null : current));
  }, []);

  return (
    <FamilyMediaPlayerContext.Provider value={{ activeId, register, unregister, requestPlay, notifyPaused }}>
      {children}
    </FamilyMediaPlayerContext.Provider>
  );
}

export function useFamilyMediaPlayer() {
  const ctx = useContext(FamilyMediaPlayerContext);
  if (!ctx) throw new Error('useFamilyMediaPlayer must be used within FamilyMediaPlayerProvider');
  return ctx;
}
