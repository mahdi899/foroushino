/**
 * Default super-admin for the Bahram admin panel, Family web, and Flutter manager app.
 * Created via `php artisan app:create-admin` — OTP exempt on the backend.
 */
export const BOOTSTRAP_ADMIN = {
  name: 'Mehdi Akbari Joghal',
  email: 'shokspy@gmail.com',
  password: 'NacP#i3Wqt9edhJlvgkj',
  mobile: '09367018089',
  role: 'super-admin',
  otpExempt: true,
  isRootAdmin: true,
} as const;

/** Prefill login fields in local development only. */
export function bootstrapAdminDevDefaults(): { email: string; password: string } | null {
  if (process.env.NODE_ENV !== 'development') return null;
  return {
    email: BOOTSTRAP_ADMIN.email,
    password: BOOTSTRAP_ADMIN.password,
  };
}
