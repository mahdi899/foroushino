'use client';

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

export type FamilyEcho = Echo<'reverb'>;

declare global {
  interface Window {
    Pusher?: typeof Pusher;
    Echo?: FamilyEcho;
  }
}

let echoSingleton: FamilyEcho | null = null;

/** True when NEXT_PUBLIC_REVERB_APP_KEY is set (client can attempt WebSocket). */
export function isRealtimeConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_REVERB_APP_KEY);
}

/**
 * Singleton Laravel Echo client for Reverb.
 * Returns null when key is missing — callers fall back to HTTP polling.
 */
export function getEcho(): FamilyEcho | null {
  if (typeof window === 'undefined') return null;
  if (!isRealtimeConfigured()) return null;

  if (echoSingleton) return echoSingleton;

  window.Pusher = Pusher;

  echoSingleton = new Echo({
    broadcaster: 'reverb',
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY!,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || 'localhost',
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT || 8080),
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT || 443),
    forceTLS: (process.env.NEXT_PUBLIC_REVERB_SCHEME || 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/api/broadcasting/auth',
    auth: {
      headers: {
        Accept: 'application/json',
      },
    },
  });

  window.Echo = echoSingleton;
  return echoSingleton;
}
