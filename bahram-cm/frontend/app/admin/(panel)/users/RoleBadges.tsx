import { Badge } from '../ui';
import type { AdminRole } from '@/lib/admin/accessTypes';

export function RoleBadges({ roles, roleCatalog }: { roles: string[]; roleCatalog: AdminRole[] }) {
  if (!roles.length) {
    return <span className="text-caption text-text-muted">بدون نقش</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((roleName) => (
        <Badge key={roleName} tone="default">
          {roleCatalog.find((role) => role.name === roleName)?.label ?? roleName}
        </Badge>
      ))}
    </div>
  );
}
