export type LoginOtpResponse = {
  otp_required?: boolean;
  mobile?: string;
  mobile_masked?: string;
  expires_in?: number;
};

export type LoginOtpStep =
  | { kind: 'authenticated' }
  | { kind: 'otp'; mobile: string; mobile_masked: string; expires_in?: number }
  | { kind: 'invalid'; message: string };

/** Normalize login payloads from Next route handlers or raw Laravel `{ data: … }`. */
export function normalizeLoginOtpResponse(json: unknown): LoginOtpResponse {
  if (!json || typeof json !== 'object') return {};

  const root = json as Record<string, unknown>;
  const nested =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : {};

  const readBool = (value: unknown): boolean | undefined =>
    typeof value === 'boolean' ? value : undefined;

  const readString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() ? value : undefined;

  const readNumber = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;

  return {
    otp_required: readBool(root.otp_required) ?? readBool(nested.otp_required),
    mobile: readString(root.mobile) ?? readString(nested.mobile),
    mobile_masked: readString(root.mobile_masked) ?? readString(nested.mobile_masked),
    expires_in: readNumber(root.expires_in) ?? readNumber(nested.expires_in),
  };
}

/** Resolve the next login step and validate OTP payloads before using mobile. */
export function resolveLoginOtpStep(
  json: unknown,
  invalidMessage = 'ورود ناموفق بود.',
): LoginOtpStep {
  const login = normalizeLoginOtpResponse(json);

  if (login.otp_required === false) {
    return { kind: 'authenticated' };
  }

  const mobile = login.mobile?.trim();
  if (!mobile) {
    return { kind: 'invalid', message: invalidMessage };
  }

  return {
    kind: 'otp',
    mobile,
    mobile_masked: login.mobile_masked?.trim() || mobile,
    expires_in: login.expires_in,
  };
}
