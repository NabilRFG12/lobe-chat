import { Flexbox } from '@lobehub/ui';
import type { FC } from 'react';
import { Outlet } from 'react-router-dom';

import { APP_PERMISSIONS } from '@/const/appPermissions';
import { isDesktop } from '@/const/version';
import ProtocolUrlHandler from '@/features/ProtocolUrlHandler';
import { PermissionGate } from '@/features/RBAC';
import { useInitAgentConfig } from '@/hooks/useInitAgentConfig';
import AgentIdSync from '@/routes/(main)/agent/_layout/AgentIdSync';

import PortalAutoCollapse from './PortalAutoCollapse';
import RegisterHotkeys from './RegisterHotkeys';
import Sidebar from './Sidebar';
import { styles } from './style';

const Layout: FC = () => {
  useInitAgentConfig();

  return (
    <PermissionGate debugId="AgentLayout" requiredPermissions={[APP_PERMISSIONS.CHAT]}>
      <Sidebar />
      <Flexbox className={styles.mainContainer} flex={1} height={'100%'}>
        <Outlet />
      </Flexbox>
      <RegisterHotkeys />
      {isDesktop && <ProtocolUrlHandler />}
      <AgentIdSync />
      <PortalAutoCollapse />
    </PermissionGate>
  );
};

export default Layout;
