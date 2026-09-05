import { useAuth } from "./AuthContext";

export function usePermissions() {
  const { me } = useAuth();
  const permissions = me?.permissions ?? [];

  function can(permission: string): boolean {
    return permissions.includes(permission);
  }

  return {
    permissions,
    group: me?.group,
    can,
  };
}
