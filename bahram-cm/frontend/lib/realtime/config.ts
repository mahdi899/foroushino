/** True when NEXT_PUBLIC_REVERB_APP_KEY is set (client can attempt WebSocket). */
export function isRealtimeConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_REVERB_APP_KEY);
}
