import { useSyncExternalStore } from 'react';

function getTouchSnapshot(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 639px)').matches;
}

function subscribeTouch(callback: () => void): () => void {
  const coarse = window.matchMedia('(pointer: coarse)');
  const narrow = window.matchMedia('(max-width: 639px)');
  coarse.addEventListener('change', callback);
  narrow.addEventListener('change', callback);
  return () => {
    coarse.removeEventListener('change', callback);
    narrow.removeEventListener('change', callback);
  };
}

/** True on phones/tablets or other coarse-pointer devices. */
export function useTouchDevice(): boolean {
  return useSyncExternalStore(subscribeTouch, getTouchSnapshot, () => false);
}
