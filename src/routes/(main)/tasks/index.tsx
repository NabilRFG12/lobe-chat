'use client';

import { APP_PERMISSIONS } from '@/const/appPermissions';
import AgentTasksPage from '@/features/AgentTasks/AgentTaskList/AgentTasksPage';
import { PermissionGate } from '@/features/RBAC';

const AllTasksPage = () => {
  return (
    <PermissionGate debugId="AllTasksPage" requiredPermissions={[APP_PERMISSIONS.TASKS]}>
      <AgentTasksPage />
    </PermissionGate>
  );
};

export default AllTasksPage;
