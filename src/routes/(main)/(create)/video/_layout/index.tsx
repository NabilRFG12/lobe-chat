'use client';

import { useTranslation } from 'react-i18next';

import { APP_PERMISSIONS } from '@/const/appPermissions';
import { PermissionGate } from '@/features/RBAC';
import GenerationLayout from '@/routes/(main)/(create)/features/GenerationLayout';
import { useVideoStore } from '@/store/video';
import { generationTopicSelectors } from '@/store/video/slices/generationTopic/selectors';

const VideoLayout = () => {
  const { t } = useTranslation(['common']);

  return (
    <PermissionGate debugId="VideoLayout" requiredPermissions={[APP_PERMISSIONS.VIDEO_GENERATION]}>
      <GenerationLayout
        breadcrumb={[{ href: '/video', title: t('tab.video') }]}
        generationTopicsSelector={generationTopicSelectors.generationTopics}
        namespace="video"
        navKey="video"
        useStore={useVideoStore}
        viewModeStatusKey="videoTopicViewMode"
      />
    </PermissionGate>
  );
};

export default VideoLayout;
