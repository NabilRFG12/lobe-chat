import { Flexbox } from '@lobehub/ui';
import type { FC } from 'react';
import { Outlet } from 'react-router-dom';

import { APP_PERMISSIONS } from '@/const/appPermissions';
import { isDesktop } from '@/const/version';
import ProtocolUrlHandler from '@/features/ProtocolUrlHandler';
import { PermissionGate } from '@/features/RBAC';
import { useInitGroupConfig } from '@/hooks/useInitGroupConfig';

import GroupIdSync from './GroupIdSync';
import RegisterHotkeys from './RegisterHotkeys';
import Sidebar from './Sidebar';
import { styles } from './style';

const Layout: FC = () => {
  useInitGroupConfig();

  return (
    <PermissionGate debugId="GroupLayout" requiredPermissions={[APP_PERMISSIONS.CHAT]}>
      <Sidebar />
      <Flexbox className={styles.mainContainer} flex={1} height={'100%'}>
        <Outlet />
      </Flexbox>
      <RegisterHotkeys />
      {isDesktop && <ProtocolUrlHandler />}
      <GroupIdSync />
    </PermissionGate>
  );
};

export default Layout;
