import { useCallback, useMemo } from 'react';

import { lambdaQuery } from '@/libs/trpc/client';

interface AccessOptions {
  allowWhileLoading?: boolean;
}

export const hasAnyPermissionCode = (
  userPermissions: ReadonlySet<string>,
  requiredPermissions?: readonly string[],
) => {
  if (!requiredPermissions || requiredPermissions.length === 0) return true;

  return requiredPermissions.some((permission) => userPermissions.has(permission));
};

export const useRbacAccess = () => {
  const query = lambdaQuery.rbacAdmin.getCurrentPermissions.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  const permissionSet = useMemo(
    () => new Set(query.data?.permissions ?? []),
    [query.data?.permissions],
  );

  const canAccess = useCallback(
    (requiredPermissions?: readonly string[], options: AccessOptions = {}) => {
      if (!requiredPermissions || requiredPermissions.length === 0) return true;
      if (query.isLoading && options.allowWhileLoading) return true;
      if (query.data?.isEnvSuperAdmin) return true;

      return hasAnyPermissionCode(permissionSet, requiredPermissions);
    },
    [permissionSet, query.data?.isEnvSuperAdmin, query.isLoading],
  );

  return {
    ...query,
    canAccess,
    isAdmin: query.data?.isAdmin ?? false,
    isEnvSuperAdmin: query.data?.isEnvSuperAdmin ?? false,
    permissionSet,
    permissions: query.data?.permissions ?? [],
    roles: query.data?.roles ?? [],
  };
};
