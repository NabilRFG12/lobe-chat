'use client';

import { useTranslation } from 'react-i18next';

import { APP_PERMISSIONS } from '@/const/appPermissions';
import { PermissionGate } from '@/features/RBAC';
import GenerationLayout from '@/routes/(main)/(create)/features/GenerationLayout';
import { useImageStore } from '@/store/image';
import { generationTopicSelectors } from '@/store/image/slices/generationTopic/selectors';

import RegisterHotkeys from './RegisterHotkeys';

const ImageLayout = () => {
  const { t } = useTranslation(['common']);

  return (
    <PermissionGate debugId="ImageLayout" requiredPermissions={[APP_PERMISSIONS.IMAGE_GENERATION]}>
      <GenerationLayout
        breadcrumb={[{ href: '/image', title: t('tab.image') }]}
        extra={<RegisterHotkeys />}
        generationTopicsSelector={generationTopicSelectors.generationTopics}
        namespace="image"
        navKey="image"
        useStore={useImageStore}
        viewModeStatusKey="imageTopicViewMode"
      />
    </PermissionGate>
  );
};

export default ImageLayout;
