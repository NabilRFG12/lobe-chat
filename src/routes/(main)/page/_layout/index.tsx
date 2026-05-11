'use client';

import { APP_PERMISSIONS } from '@/const/appPermissions';
import { PageLayout } from '@/features/Pages';
import { PermissionGate } from '@/features/RBAC';

const DesktopPagesLayout = () => {
  return (
    <PermissionGate debugId="PagesLayout" requiredPermissions={[APP_PERMISSIONS.PAGES]}>
      <PageLayout />
    </PermissionGate>
  );
};

export default DesktopPagesLayout;
