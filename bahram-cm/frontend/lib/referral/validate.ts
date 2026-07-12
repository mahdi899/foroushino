import { apiErrorMessage } from "@/lib/api/errors";
import { readReferralCode, setReferralCode } from "@/lib/referral/capture";

export type ReferralValidation = {
  code: string;
};

function publicApiBase(): string {
  const backend = (process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.BACKEND_PROXY_URL ?? "http://127.0.0.1:8010").replace(
    /\/+$/,
    "",
  );
  return `${backend}/api`;
}

export async function validateReferralCode(input: {
  code: string;
  token?: string;
}): Promise<{ ok: true; data: ReferralValidation } | { ok: false; error: string }> {
  const res = await fetch(`${publicApiBase()}/referral-codes/validate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
    },
    body: JSON.stringify({ code: input.code }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: apiErrorMessage(json, "ref", "کد معرف معتبر نیست."),
    };
  }

  return { ok: true, data: json.data as ReferralValidation };
}

/** Returns a validated referral code for checkout, clearing stale cookie values. */
export async function resolveReferralCodeForCheckout(token?: string): Promise<string | undefined> {
  const raw = readReferralCode();
  if (!raw) return undefined;

  const result = await validateReferralCode({ code: raw, token });
  if (!result.ok) {
    setReferralCode("");
    return undefined;
  }

  setReferralCode(result.data.code);
  return result.data.code;
}
