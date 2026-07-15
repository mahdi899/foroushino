/** Default timeout for server-side Laravel API calls (prevents infinite route loading). */
export const SERVER_FETCH_TIMEOUT_MS = 10_000;

export function serverFetchSignal(): AbortSignal {
  return AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS);
}
