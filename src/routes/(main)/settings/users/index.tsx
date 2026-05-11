'use client';

import { Avatar, Block, Button, Flexbox, Icon, Tag, Text } from '@lobehub/ui';
import { App, Empty, Form, Input, Modal, Select, Space, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { Plus } from 'lucide-react';
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

interface CreateUserFormValues {
  email: string;
  name?: string;
  password: string;
  roleIds?: string[];
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
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm<CreateUserFormValues>();

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

  const createUser = lambdaQuery.rbacAdmin.createUser.useMutation({
    onError: (error) => {
      message.error(error.message);
    },
    onSuccess: async () => {
      setCreateOpen(false);
      form.resetFields();
      await utils.rbacAdmin.listUsers.invalidate();
      message.success('User created. Share the temporary password securely.');
    },
  });

  const roleOptions = useMemo(
    () =>
      roles
        .filter((role) => access?.isEnvSuperAdmin || role.name !== 'super_admin')
        .map((role) => ({
          label: role.displayName,
          value: role.id,
        })),
    [access?.isEnvSuperAdmin, roles],
  );

  const canAssignRoles =
    !!access?.isEnvSuperAdmin ||
    !!access?.permissions.includes(RBAC_PERMISSIONS.RBAC_USER_ROLE_UPDATE_ALL);
  const canCreateUsers =
    !!access?.isEnvSuperAdmin || !!access?.permissions.includes(RBAC_PERMISSIONS.USER_CREATE_ALL);

  const defaultRoleId = useMemo(
    () => roles.find((role) => role.name === 'agent_user')?.id,
    [roles],
  );

  const handleOpenCreate = () => {
    form.setFieldsValue({ roleIds: defaultRoleId ? [defaultRoleId] : [] });
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    const values = await form.validateFields();
    createUser.mutate({
      email: values.email,
      name: values.name,
      password: values.password,
      roleIds: values.roleIds,
    });
  };

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
      <SettingHeader
        title={t('tab.users')}
        extra={
          <Button disabled={!canCreateUsers} icon={<Icon icon={Plus} />} onClick={handleOpenCreate}>
            Create user
          </Button>
        }
      />
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
      <Modal
        confirmLoading={createUser.isPending}
        destroyOnHidden
        okText="Create user"
        open={createOpen}
        title="Create user"
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { message: 'Email is required.', required: true },
              { message: 'Enter a valid email address.', type: 'email' },
            ]}
          >
            <Input autoComplete="off" placeholder="employee@nabiler.com" />
          </Form.Item>
          <Form.Item label="Name" name="name">
            <Input autoComplete="off" placeholder="Employee name" />
          </Form.Item>
          <Form.Item
            extra="The employee can use this password on the sign-in page."
            label="Temporary password"
            name="password"
            rules={[
              { message: 'Password is required.', required: true },
              { message: 'Use at least 8 characters.', min: 8 },
              { max: 64, message: 'Use 64 characters or fewer.' },
            ]}
          >
            <Input.Password autoComplete="new-password" placeholder="Minimum 8 characters" />
          </Form.Item>
          <Form.Item label="Roles" name="roleIds">
            <Select
              mode="multiple"
              options={roleOptions}
              placeholder="Select roles"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
});

UsersSetting.displayName = 'UsersSetting';

export default UsersSetting;
