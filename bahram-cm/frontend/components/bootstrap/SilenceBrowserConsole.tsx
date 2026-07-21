'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'bahram-console-debug';

function isConsoleDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search).get('bahramDebug');
    if (q === '1' || q === 'console') return true;
    if (q === '0') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Mutes noisy console.log/info/debug in production.
 * Keep warn/error. Re-enable with `?bahramDebug=1` or localStorage.bahram-console-debug=1.
 */
export function SilenceBrowserConsole() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (isConsoleDebugEnabled()) return;
    if (typeof window === 'undefined') return;

    const original = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console),
    };

    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.debug = noop;

    return () => {
      console.log = original.log;
      console.info = original.info;
      console.debug = original.debug;
    };
  }, []);

  return null;
}
