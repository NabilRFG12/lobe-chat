'use client';

import { Block, Button, Flexbox, Icon, Tag, Text } from '@lobehub/ui';
import { App, Empty, Form, Input, Modal, Select, Space, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RBAC_PERMISSIONS } from '@/const/rbac';
import { lambdaQuery } from '@/libs/trpc/client';
import SettingHeader from '@/routes/(main)/settings/features/SettingHeader';

interface PermissionRow {
  category: string;
  code: string;
  id: string;
  name: string;
}

interface RoleRow {
  description?: string | null;
  displayName: string;
  id: string;
  isActive: boolean;
  isSystem: boolean;
  name: string;
  permissionIds: string[];
}

interface RoleFormValues {
  description?: string;
  displayName: string;
  name: string;
  permissionIds?: string[];
}

const RolesSetting = memo(() => {
  const { message } = App.useApp();
  const { t } = useTranslation('setting');
  const utils = lambdaQuery.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm<RoleFormValues>();

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

  const { data: permissions = [], isLoading: isPermissionsLoading } =
    lambdaQuery.rbacAdmin.listPermissions.useQuery(undefined, {
      enabled: !!access?.isAdmin,
      retry: false,
    });

  const permissionOptions = useMemo(
    () =>
      (permissions as PermissionRow[]).map((permission) => ({
        label: `${permission.code}`,
        value: permission.id,
      })),
    [permissions],
  );

  const canManage = (permission: string) =>
    !!access?.isEnvSuperAdmin || !!access?.permissions.includes(permission);

  const createRole = lambdaQuery.rbacAdmin.createRole.useMutation({
    onError: (error) => message.error(error.message),
    onSuccess: async () => {
      setCreateOpen(false);
      form.resetFields();
      await utils.rbacAdmin.listRoles.invalidate();
      message.success('Role created');
    },
  });

  const deleteRole = lambdaQuery.rbacAdmin.deleteRole.useMutation({
    onError: (error) => message.error(error.message),
    onSuccess: async () => {
      await utils.rbacAdmin.listRoles.invalidate();
      await utils.rbacAdmin.listUsers.invalidate();
      message.success('Role deleted');
    },
  });

  const updateRolePermissions = lambdaQuery.rbacAdmin.updateRolePermissions.useMutation({
    onError: (error) => message.error(error.message),
    onSuccess: async () => {
      await utils.rbacAdmin.listRoles.invalidate();
      message.success('Role permissions updated');
    },
  });

  const columns: TableColumnsType<RoleRow> = [
    {
      dataIndex: 'displayName',
      render: (_, record) => (
        <Flexbox>
          <Space>
            <Text strong>{record.displayName}</Text>
            {record.isSystem && <Tag>system</Tag>}
            {!record.isActive && <Tag color="red">inactive</Tag>}
          </Space>
          <Text type="secondary">{record.name}</Text>
          {record.description && <Text type="secondary">{record.description}</Text>}
        </Flexbox>
      ),
      title: 'Role',
      width: 280,
    },
    {
      dataIndex: 'permissionIds',
      render: (permissionIds: string[], record) => (
        <Select
          disabled={
            record.name === 'super_admin' || !canManage(RBAC_PERMISSIONS.RBAC_ROLE_UPDATE_ALL)
          }
          mode="multiple"
          options={permissionOptions}
          placeholder="Select permissions"
          style={{ width: '100%' }}
          value={permissionIds}
          onChange={(nextPermissionIds) =>
            updateRolePermissions.mutate({
              permissionIds: nextPermissionIds,
              roleId: record.id,
            })
          }
        />
      ),
      title: 'Permissions',
    },
    {
      render: (_, record) => (
        <Button
          disabled={record.isSystem || !canManage(RBAC_PERMISSIONS.RBAC_ROLE_DELETE_ALL)}
          icon={<Icon icon={Trash2} />}
          type="text"
          onClick={() => deleteRole.mutate({ roleId: record.id })}
        />
      ),
      title: '',
      width: 64,
    },
  ];

  const handleCreate = async () => {
    const values = await form.validateFields();
    createRole.mutate({
      description: values.description,
      displayName: values.displayName,
      name: values.name,
      permissionIds: values.permissionIds || [],
    });
  };

  if (!isAccessLoading && !access?.isAdmin) {
    return (
      <>
        <SettingHeader title={t('tab.roles')} />
        <Empty description="You do not have permission to manage roles." />
      </>
    );
  }

  return (
    <>
      <SettingHeader
        title={t('tab.roles')}
        extra={
          <Button
            disabled={!canManage(RBAC_PERMISSIONS.RBAC_ROLE_CREATE_ALL)}
            icon={<Icon icon={Plus} />}
            onClick={() => setCreateOpen(true)}
          >
            Create role
          </Button>
        }
      />
      <Block gap={16} padding={16} variant="outlined">
        <Table<RoleRow>
          columns={columns}
          dataSource={roles as RoleRow[]}
          loading={isAccessLoading || isRolesLoading || isPermissionsLoading}
          pagination={false}
          rowKey="id"
        />
      </Block>
      <Modal
        destroyOnHidden
        open={createOpen}
        title="Create role"
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Name"
            name="name"
            rules={[
              { required: true },
              {
                message: 'Use lowercase letters, numbers, and underscores only.',
                pattern: /^[a-z0-9_]+$/,
              },
            ]}
          >
            <Input placeholder="support_manager" />
          </Form.Item>
          <Form.Item label="Display name" name="displayName" rules={[{ required: true }]}>
            <Input placeholder="Support Manager" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Permissions" name="permissionIds">
            <Select
              mode="multiple"
              options={permissionOptions}
              placeholder="Select permissions"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
});

RolesSetting.displayName = 'RolesSetting';

export default RolesSetting;
