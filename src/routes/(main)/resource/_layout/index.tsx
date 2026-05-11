'use client';

import type { FC } from 'react';
import { Outlet } from 'react-router-dom';

import { APP_PERMISSIONS } from '@/const/appPermissions';
import { PermissionGate } from '@/features/RBAC';

import RegisterHotkeys from './RegisterHotkeys';

const ResourceLayout: FC = () => {
  return (
    <PermissionGate debugId="ResourceLayout" requiredPermissions={[APP_PERMISSIONS.RESOURCE]}>
      <Outlet />
      <RegisterHotkeys />
    </PermissionGate>
  );
};

export default ResourceLayout;
