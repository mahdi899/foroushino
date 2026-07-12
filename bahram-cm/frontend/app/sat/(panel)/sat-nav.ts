export type SatNavItem = {
  href: string;
  label: string;
  icon: string;
  permission?: string;
  anyPermission?: string[];
  superAdminOnly?: boolean;
};

export const SAT_NAV: SatNavItem[] = [
  { href: '/sat', label: 'داشبورد', icon: 'LayoutDashboard' },
  { href: '/sat/leads', label: 'سرنخ‌ها', icon: 'Users', anyPermission: ['sat.leads.view_own', 'sat.leads.view_team', 'sat.leads.view_all'] },
  { href: '/sat/calls', label: 'تماس‌ها', icon: 'Phone', anyPermission: ['sat.calls.view_own', 'sat.calls.view_team', 'sat.calls.view_all'] },
  { href: '/sat/activities', label: 'فعالیت‌ها', icon: 'ClipboardList', anyPermission: ['sat.activities.view_own', 'sat.activities.view_team', 'sat.activities.view_all'] },
  { href: '/sat/staff', label: 'پرسنل', icon: 'UserCog', permission: 'sat.staff.view' },
  { href: '/sat/finance', label: 'مالی', icon: 'Wallet', anyPermission: ['sat.deposits.view', 'sat.withdrawals.view'] },
  { href: '/sat/integrations', label: 'اتصال API', icon: 'Link', superAdminOnly: true },
];

export function filterSatNav(user: { permissions: string[]; is_super_admin?: boolean } | null): SatNavItem[] {
  if (!user) return [];
  return SAT_NAV.filter((item) => {
    if (item.superAdminOnly) return Boolean(user.is_super_admin);
    if (user.is_super_admin) return true;
    if (item.permission) return user.permissions.includes(item.permission);
    if (item.anyPermission) return item.anyPermission.some((p) => user.permissions.includes(p));
    return true;
  });
}
