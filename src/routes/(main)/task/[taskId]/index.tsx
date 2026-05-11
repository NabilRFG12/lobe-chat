'use client';

import { memo } from 'react';
import { useParams } from 'react-router-dom';

import { APP_PERMISSIONS } from '@/const/appPermissions';
import { TaskDetailPage } from '@/features/AgentTasks';
import { PermissionGate } from '@/features/RBAC';

const TaskDetailRoute = memo(() => {
  const { taskId } = useParams<{ taskId?: string }>();

  if (!taskId) return null;

  return (
    <PermissionGate debugId="TaskDetailRoute" requiredPermissions={[APP_PERMISSIONS.TASKS]}>
      <TaskDetailPage taskId={taskId} />
    </PermissionGate>
  );
});

export default TaskDetailRoute;
