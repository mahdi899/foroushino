import { apiErrorMessage } from "@/lib/api/errors";
import { checkoutPublicApiBase } from "@/lib/api/checkoutPublicApi";
import { readReferralCode, setReferralCode } from "@/lib/referral/capture";

export type ReferralValidation = {
  code: string;
};

export async function validateReferralCode(input: {
  code: string;
  token?: string;
}): Promise<{ ok: true; data: ReferralValidation } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${checkoutPublicApiBase()}/referral-codes/validate`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
      },
      body: JSON.stringify({ code: input.code }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: apiErrorMessage(json, "ref", "کد معرف یافت نشد."),
      };
    }

    return { ok: true, data: json.data as ReferralValidation };
  } catch {
    return { ok: false, error: "بررسی کد معرف انجام نشد. دوباره تلاش کنید." };
  }
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
