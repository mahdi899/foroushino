import { getJson, type ApiResult } from "./api";

export type CompanionVoice = {
  id: number;
  title_fa?: string | null;
  body_preview_fa?: string | null;
  publish_date: string;
  type: string;
};

export type CompanionOverview = {
  user_name?: string | null;
  tier: number;
  ledger_count: number;
  recent_voices: CompanionVoice[];
};

/** Minimum plausible token length before we bother hitting the backend. */
export const COMPANION_TOKEN_MIN = 10;

export function isPlausibleToken(token: string): boolean {
  return token.trim().length > COMPANION_TOKEN_MIN;
}

export async function fetchCompanionOverview(
  token: string,
): Promise<ApiResult<CompanionOverview>> {
  const trimmed = token.trim();
  const path = `/ecosystem/companion/overview?token=${encodeURIComponent(trimmed)}`;
  const result = await getJson<CompanionOverview | null>(path);
  if (!result.ok) return result;
  if (!result.data) {
    return { ok: false, error: "توکن معتبر نیست یا منقضی شده.", code: "invalid_token" };
  }
  return { ok: true, data: result.data };
}
