export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission)
}

export function hasAnyPermission(permissions: string[], names: string[]): boolean {
  return names.some((name) => permissions.includes(name))
}
