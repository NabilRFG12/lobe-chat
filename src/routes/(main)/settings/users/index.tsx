'use client';

import { Avatar, Block, Flexbox, Tag, Text } from '@lobehub/ui';
import { App, Empty, Input, Select, Space, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RBAC_PERMISSIONS } from '@/const/rbac';
import { lambdaQuery } from '@/libs/trpc/client';
import SettingHeader from '@/routes/(main)/settings/features/SettingHeader';

interface RoleOption {
  displayName: string;
  id: string;
  name: string;
}

interface UserRow {
  avatar?: string | null;
  banned?: boolean | null;
  createdAt?: Date | string | null;
  email?: string | null;
  fullName?: string | null;
  id: string;
  isEnvSuperAdmin: boolean;
  lastActiveAt?: Date | string | null;
  roleIds: string[];
  roles: RoleOption[];
  username?: string | null;
}

const formatDate = (value?: Date | string | null) => {
  if (!value) return '-';

  return new Date(value).toLocaleDateString();
};

const UsersSetting = memo(() => {
  const { message } = App.useApp();
  const { t } = useTranslation('setting');
  const utils = lambdaQuery.useUtils();
  const [keyword, setKeyword] = useState('');

  const { data: access, isLoading: isAccessLoading } =
    lambdaQuery.rbacAdmin.getCurrentPermissions.useQuery(undefined, {
      retry: false,
    });

  const { data: roles = [], isLoading: isRolesLoading } = lambdaQuery.rbacAdmin.listRoles.useQuery(
    undefined,
    {
      enabled: !!access?.isAdmin,
      retry: false,
    },
  );

  const { data: users = [], isLoading: isUsersLoading } = lambdaQuery.rbacAdmin.listUsers.useQuery(
    { q: keyword || undefined },
    {
      enabled: !!access?.isAdmin,
      retry: false,
    },
  );

  const updateUserRoles = lambdaQuery.rbacAdmin.updateUserRoles.useMutation({
    onError: (error) => {
      message.error(error.message);
    },
    onSuccess: async () => {
      await utils.rbacAdmin.listUsers.invalidate();
      message.success('User roles updated');
    },
  });

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        label: role.displayName,
        value: role.id,
      })),
    [roles],
  );

  const canAssignRoles =
    !!access?.isEnvSuperAdmin ||
    !!access?.permissions.includes(RBAC_PERMISSIONS.RBAC_USER_ROLE_UPDATE_ALL);

  const columns: TableColumnsType<UserRow> = [
    {
      dataIndex: 'email',
      render: (_, record) => (
        <Flexbox horizontal align="center" gap={12}>
          <Avatar
            avatar={record.avatar || record.fullName || record.email || record.username || '?'}
            size={36}
          />
          <Flexbox>
            <Text strong>
              {record.fullName || record.username || record.email || 'Unnamed user'}
            </Text>
            <Text type="secondary">{record.email || record.id}</Text>
          </Flexbox>
        </Flexbox>
      ),
      title: 'User',
    },
    {
      dataIndex: 'roles',
      render: (_, record) => (
        <Space wrap>
          {record.roles.length === 0 && <Tag>no role</Tag>}
          {record.roles.map((role) => (
            <Tag key={role.id}>{role.displayName}</Tag>
          ))}
          {record.isEnvSuperAdmin && <Tag color="green">env admin</Tag>}
          {record.banned && <Tag color="red">banned</Tag>}
        </Space>
      ),
      title: 'Current roles',
      width: 260,
    },
    {
      dataIndex: 'roleIds',
      render: (roleIds: string[], record) => (
        <Select
          disabled={!canAssignRoles}
          mode="multiple"
          options={roleOptions}
          style={{ minWidth: 280, width: '100%' }}
          value={roleIds}
          onChange={(nextRoleIds) =>
            updateUserRoles.mutate({ roleIds: nextRoleIds, userId: record.id })
          }
        />
      ),
      title: 'Assign roles',
      width: 320,
    },
    {
      dataIndex: 'lastActiveAt',
      render: formatDate,
      title: 'Last active',
      width: 140,
    },
  ];

  const loading = isAccessLoading || isRolesLoading || isUsersLoading;

  if (!isAccessLoading && !access?.isAdmin) {
    return (
      <>
        <SettingHeader title={t('tab.users')} />
        <Empty description="You do not have permission to manage users." />
      </>
    );
  }

  return (
    <>
      <SettingHeader title={t('tab.users')} />
      <Block gap={16} padding={16} variant="outlined">
        <Flexbox gap={12}>
          <Input.Search
            allowClear
            placeholder="Search users by email, username, or name"
            style={{ maxWidth: 420 }}
            onSearch={setKeyword}
          />
          <Table<UserRow>
            columns={columns}
            dataSource={users as UserRow[]}
            loading={loading}
            pagination={{ pageSize: 20 }}
            rowKey="id"
          />
        </Flexbox>
      </Block>
    </>
  );
});

UsersSetting.displayName = 'UsersSetting';

export default UsersSetting;
