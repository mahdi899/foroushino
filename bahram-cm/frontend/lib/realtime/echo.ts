'use client';

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { familyFeedDebug } from '@/lib/family/feedDebug';

export type FamilyEcho = Echo<'reverb'>;

declare global {
  interface Window {
    Pusher?: typeof Pusher;
    Echo?: FamilyEcho;
  }
}

let echoSingleton: FamilyEcho | null = null;

export type FamilyRealtimeConnectionState =
  | 'unknown'
  | 'initialized'
  | 'connecting'
  | 'connected'
  | 'unavailable'
  | 'failed'
  | 'disconnected';

let connectionState: FamilyRealtimeConnectionState = 'unknown';

/** Latest known Reverb/Pusher connection state — for the `familyDebug.snapshot()` report. */
export function getFamilyRealtimeConnectionState(): FamilyRealtimeConnectionState {
  return connectionState;
}

if (typeof window !== 'undefined') {
  familyFeedDebug.registerSnapshotSource('ws', () => ({
    configured: isRealtimeConfigured(),
    connectionState,
    hasSingleton: Boolean(echoSingleton),
  }));
}

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
  bindConnectionStateLogging(echoSingleton);
  return echoSingleton;
}

function bindConnectionStateLogging(echo: FamilyEcho): void {
  try {
    const pusherConnection = (echo.connector as unknown as { pusher?: { connection?: PusherLikeConnection } })
      .pusher?.connection;
    if (!pusherConnection) return;

    connectionState = (pusherConnection.state as FamilyRealtimeConnectionState) ?? 'unknown';
    pusherConnection.bind('state_change', (states: { previous: string; current: string }) => {
      connectionState = (states.current as FamilyRealtimeConnectionState) ?? 'unknown';
      const level = states.current === 'failed' || states.current === 'unavailable' ? 'warn' : 'info';
      familyFeedDebug[level]('realtime', `ws ${states.previous} → ${states.current}`, states);
    });
  } catch (err) {
    familyFeedDebug.warn('realtime', 'ws state logging unavailable', { error: String(err) });
  }
}

type PusherLikeConnection = {
  state?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bind: (event: string, cb: (...args: any[]) => void) => void;
};
