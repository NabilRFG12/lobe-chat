'use client';

import { Flexbox } from '@lobehub/ui';
import type { FC } from 'react';
import { Outlet } from 'react-router-dom';

import { APP_PERMISSIONS } from '@/const/appPermissions';
import { PermissionGate } from '@/features/RBAC';

import Sidebar from './Sidebar';
import { styles } from './style';

const DesktopMemoryLayout: FC = () => {
  return (
    <PermissionGate debugId="MemoryLayout" requiredPermissions={[APP_PERMISSIONS.MEMORY]}>
      <Sidebar />
      <Flexbox className={styles.mainContainer} flex={1} height={'100%'}>
        <Outlet />
      </Flexbox>
    </PermissionGate>
  );
};

export default DesktopMemoryLayout;
