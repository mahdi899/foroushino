/** Client-safe student user shapes (no server-only imports). */

export interface StudentProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  city: string | null;
  age: number | null;
  current_job: string | null;
  instagram: string | null;
  telegram: string | null;
  experience_level: string | null;
  income_goal: string | null;
  avatar: string | null;
  avatar_url: string | null;
  avatar_version?: number | null;
  gravatar_url: string | null;
  default_avatar_url: string | null;
}

export interface StudentIdentity {
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  date_of_birth: string | null;
  gender: string | null;
}

export interface StudentUser {
  id: number;
  name: string;
  mobile: string;
  has_password: boolean;
  first_login_at: string | null;
  profile: StudentProfile | null;
  identity?: StudentIdentity | null;
  verification_level?: number;
  identity_status?: string | null;
  mobile_ownership_status?: string | null;
  verified_bank_accounts_count?: number;
  sat_membership_status?: string | null;
  national_code_masked?: string | null;
}
