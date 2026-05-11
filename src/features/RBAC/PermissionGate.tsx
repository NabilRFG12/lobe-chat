'use client';

import { Center, Empty } from '@lobehub/ui';
import { ShieldAlert } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import Loading from '@/components/Loading/BrandTextLoading';
import { useRbacAccess } from '@/hooks/useRbacAccess';

interface PermissionGateProps extends PropsWithChildren {
  debugId?: string;
  requiredPermissions?: readonly string[];
}

const PermissionGate = memo<PermissionGateProps>(
  ({ children, debugId = 'PermissionGate', requiredPermissions }) => {
    const { t } = useTranslation('setting');
    const { canAccess, isLoading } = useRbacAccess();

    if (!requiredPermissions || requiredPermissions.length === 0) return <>{children}</>;
    if (isLoading) return <Loading debugId={debugId} />;

    if (!canAccess(requiredPermissions)) {
      return (
        <Center height="100%" width="100%">
          <Empty
            description={t('rbac.denied.desc')}
            icon={ShieldAlert}
            style={{ maxWidth: 420 }}
            title={t('rbac.denied.title')}
          />
        </Center>
      );
    }

    return <>{children}</>;
  },
);

PermissionGate.displayName = 'PermissionGate';

export default PermissionGate;
