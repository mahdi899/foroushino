export type AdminRole = {
  id: number;
  name: string;
  label: string;
  description?: string | null;
  is_system: boolean;
  permissions: string[];
  users_count?: number | null;
};

export type PermissionItem = {
  name: string;
  label: string;
  reserved: boolean;
};

export type PermissionGroup = {
  module: string;
  permissions: PermissionItem[];
};

export type AdminRoleListResponse = {
  data: AdminRole[];
  permission_groups: PermissionGroup[];
};

export type AdminUserRow = {
  id: number;
  name: string;
  email: string;
  mobile?: string | null;
  roles: string[];
  is_super_admin: boolean;
  can_view_email?: boolean;
  can_create?: boolean;
  can_assign_role?: boolean;
  can_delete?: boolean;
};

export type AuditLogEntry = {
  id: number;
  actor_id: number | null;
  actor_name: string | null;
  actor_email: string | null;
  action: string;
  subject_type: string | null;
  subject_id: number | string | null;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export const MODULE_LABELS_FA: Record<string, string> = {
  Students: 'دانشجویان',
  'Identity Verification': 'احراز هویت',
  'Identity Providers': 'سرویس‌های احراز هویت',
  SAT: 'سات',
  Finance: 'مالی',
  Content: 'محتوا',
  SMS: 'پیامک',
  Audit: 'ممیزی',
  'Roles & Permissions': 'نقش‌ها و دسترسی‌ها',
  Admins: 'مدیران',
  Support: 'پشتیبانی',
  Orders: 'سفارش‌ها',
  Settings: 'تنظیمات',
};
