import { TRPCError } from '@trpc/server';
import { asc, eq, ilike, inArray, or } from 'drizzle-orm';
import { z } from 'zod';

import { auth } from '@/auth';
import { APP_PERMISSION_DEFINITIONS, APP_PERMISSIONS } from '@/const/appPermissions';
import { RBAC_PERMISSIONS } from '@/const/rbac';
import { RbacModel } from '@/database/models/rbac';
import { permissions, rolePermissions, roles, userRoles, users } from '@/database/schemas';
import type { LobeChatDatabase } from '@/database/type';
import { authedProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';

const SUPER_ADMIN_ROLE = 'super_admin';
const DEFAULT_USER_ROLE = 'agent_user';

const adminEmailAllowlist = () => {
  const explicit = process.env.APP_SUPER_ADMIN_EMAILS;
  const authAllowed = process.env.AUTH_ALLOWED_EMAILS;

  return [explicit, authAllowed]
    .filter(Boolean)
    .join(',')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.includes('@'));
};

const DEFAULT_PERMISSIONS = [
  ...Object.values(RBAC_PERMISSIONS).map((code) => ({
    category: code.split(':')[0],
    code,
    description: `Allows ${code}`,
    name: code,
  })),
  ...APP_PERMISSION_DEFINITIONS,
  {
    category: 'community',
    code: 'community:view',
    description: 'View community catalog',
    name: 'View community',
  },
  {
    category: 'community',
    code: 'community:install',
    description: 'Install community items',
    name: 'Install community items',
  },
  {
    category: 'image',
    code: 'image:use',
    description: 'Use image generation',
    name: 'Use image generation',
  },
  {
    category: 'video',
    code: 'video:use',
    description: 'Use video generation',
    name: 'Use video generation',
  },
] as const;

const SUPER_ADMIN_PERMISSIONS = DEFAULT_PERMISSIONS.map((permission) => permission.code);
const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

const createUserInputSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  name: z.string().trim().optional(),
  password: z.string().min(8).max(64),
  roleIds: z.array(z.string()).optional(),
});

const readOnlyPermissions = Object.values(RBAC_PERMISSIONS).filter((code) =>
  code.includes(':read:'),
);
const chatUserPermissions = [
  'agent:read:owner',
  'agent:create:owner',
  'agent:update:owner',
  'file:read:owner',
  'file:upload:owner',
  'knowledge_base:read:owner',
  'message:read:owner',
  'message:create:owner',
  'message:update:owner',
  'session:read:owner',
  'session:create:owner',
  'session:update:owner',
  'topic:read:owner',
  'topic:create:owner',
  'topic:update:owner',
];

const DEFAULT_ROLES = [
  {
    description: 'Full system access. Keep this role limited to trusted owners.',
    displayName: 'Super Admin',
    isSystem: true,
    name: SUPER_ADMIN_ROLE,
    permissions: SUPER_ADMIN_PERMISSIONS,
  },
  {
    description: 'Can manage users, roles, providers, models, and app settings.',
    displayName: 'Admin',
    isSystem: true,
    name: 'admin',
    permissions: SUPER_ADMIN_PERMISSIONS.filter(
      (code) => !code.startsWith('rbac:permission_delete'),
    ),
  },
  {
    description: 'Can use chat, own agents, uploads, tasks, and personal resources.',
    displayName: 'Agent User',
    isSystem: true,
    name: DEFAULT_USER_ROLE,
    permissions: [
      ...chatUserPermissions,
      APP_PERMISSIONS.CHAT,
      APP_PERMISSIONS.COMMUNITY,
      APP_PERMISSIONS.IMAGE_GENERATION,
      APP_PERMISSIONS.MEMORY,
      APP_PERMISSIONS.PAGES,
      APP_PERMISSIONS.RESOURCE,
      APP_PERMISSIONS.TASKS,
      APP_PERMISSIONS.VIDEO_GENERATION,
    ],
  },
  {
    description: 'Read-only access to owned app content.',
    displayName: 'Viewer',
    isSystem: true,
    name: 'viewer',
    permissions: [
      ...readOnlyPermissions,
      APP_PERMISSIONS.CHAT,
      APP_PERMISSIONS.COMMUNITY,
      APP_PERMISSIONS.MEMORY,
      APP_PERMISSIONS.PAGES,
      APP_PERMISSIONS.RESOURCE,
    ],
  },
  {
    description: 'No product permissions. Use this role to disable access without deleting data.',
    displayName: 'Blocked',
    isSystem: true,
    name: 'blocked',
    permissions: [],
  },
] as const;

const rbacProcedure = authedProcedure.use(serverDatabase).use(async ({ ctx, next }) => {
  const rbacModel = new RbacModel(ctx.serverDB, ctx.userId);

  return next({
    ctx: {
      rbacModel,
    },
  });
});

const ensureDefaultRbac = async (db: LobeChatDatabase) => {
  await db
    .insert(permissions)
    .values([...DEFAULT_PERMISSIONS])
    .onConflictDoNothing({ target: permissions.code });

  await db
    .insert(roles)
    .values(
      DEFAULT_ROLES.map(({ permissions: _permissionCodes, ...role }) => ({
        ...role,
        metadata: {},
      })),
    )
    .onConflictDoNothing({ target: roles.name });

  const [permissionRows, roleRows] = await Promise.all([
    db.query.permissions.findMany(),
    db.query.roles.findMany(),
  ]);
  const permissionIdByCode = new Map(permissionRows.map((item) => [item.code, item.id]));
  const roleIdByName = new Map(roleRows.map((item) => [item.name, item.id]));

  const rolePermissionRows = DEFAULT_ROLES.flatMap((role) => {
    const roleId = roleIdByName.get(role.name);
    if (!roleId) return [];

    const rows: { permissionId: string; roleId: string }[] = [];

    for (const code of role.permissions) {
      const permissionId = permissionIdByCode.get(code);
      if (permissionId) rows.push({ permissionId, roleId });
    }

    return rows;
  });

  if (rolePermissionRows.length > 0) {
    await db.insert(rolePermissions).values(rolePermissionRows).onConflictDoNothing();
  }
};

const getCurrentUser = async (db: LobeChatDatabase, userId: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });

  return user;
};

const isEnvSuperAdmin = (email?: string | null) => {
  if (!email) return false;

  return adminEmailAllowlist().includes(email.toLowerCase());
};

const requireAnyPermission = async (
  db: LobeChatDatabase,
  rbacModel: RbacModel,
  userId: string,
  permissionCodes: string[],
) => {
  await ensureDefaultRbac(db);
  await assignEnvSuperAdminRoles(db);

  const user = await getCurrentUser(db, userId);
  if (isEnvSuperAdmin(user.email)) return user;

  const canManage = await rbacModel.hasAnyPermission(permissionCodes);

  if (!canManage) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
  }

  return user;
};

const requireRbacAdmin = async (db: LobeChatDatabase, rbacModel: RbacModel, userId: string) =>
  requireAnyPermission(db, rbacModel, userId, [
    RBAC_PERMISSIONS.RBAC_ROLE_READ_ALL,
    RBAC_PERMISSIONS.RBAC_USER_ROLE_READ_ALL,
    RBAC_PERMISSIONS.RBAC_USER_ROLE_UPDATE_ALL,
    RBAC_PERMISSIONS.USER_READ_ALL,
  ]);

const assignEnvSuperAdminRoles = async (db: LobeChatDatabase) => {
  const emails = adminEmailAllowlist();
  if (emails.length === 0) return;

  const superAdminRole = await db.query.roles.findFirst({
    where: eq(roles.name, SUPER_ADMIN_ROLE),
  });
  if (!superAdminRole) return;

  const adminUsers = await db.query.users.findMany({
    where: inArray(users.email, emails),
  });

  if (adminUsers.length === 0) return;

  await db
    .insert(userRoles)
    .values(adminUsers.map((user) => ({ roleId: superAdminRole.id, userId: user.id })))
    .onConflictDoNothing();
};

const assignDefaultUserRole = async (db: LobeChatDatabase, userId: string) => {
  const existingRole = await db.query.userRoles.findFirst({
    where: eq(userRoles.userId, userId),
  });
  if (existingRole) return;

  const defaultRole = await db.query.roles.findFirst({
    where: eq(roles.name, DEFAULT_USER_ROLE),
  });
  if (!defaultRole) return;

  await db.insert(userRoles).values({ roleId: defaultRole.id, userId }).onConflictDoNothing();
};

const resolveNewUserRoleIds = async (db: LobeChatDatabase, roleIds?: string[]) => {
  if (roleIds) {
    const uniqueRoleIds = [...new Set(roleIds)];
    if (uniqueRoleIds.length === 0) return [];

    const selectedRoles = await db.query.roles.findMany({
      where: inArray(roles.id, uniqueRoleIds),
    });
    if (selectedRoles.length !== uniqueRoleIds.length) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'One or more roles do not exist' });
    }

    return uniqueRoleIds;
  }

  const defaultRole = await db.query.roles.findFirst({
    where: eq(roles.name, DEFAULT_USER_ROLE),
  });

  return defaultRole ? [defaultRole.id] : [];
};

export const rbacAdminRouter = router({
  bootstrap: rbacProcedure.mutation(async ({ ctx }) => {
    await ensureDefaultRbac(ctx.serverDB);
    const user = await requireRbacAdmin(ctx.serverDB, ctx.rbacModel, ctx.userId);
    await assignEnvSuperAdminRoles(ctx.serverDB);

    return { isEnvSuperAdmin: isEnvSuperAdmin(user.email), success: true };
  }),

  createRole: rbacProcedure
    .input(
      z.object({
        description: z.string().optional(),
        displayName: z.string().min(1),
        name: z
          .string()
          .min(1)
          .regex(/^[a-z0-9_]+$/),
        permissionIds: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAnyPermission(ctx.serverDB, ctx.rbacModel, ctx.userId, [
        RBAC_PERMISSIONS.RBAC_ROLE_CREATE_ALL,
      ]);

      const [role] = await ctx.serverDB
        .insert(roles)
        .values({
          description: input.description,
          displayName: input.displayName,
          isSystem: false,
          metadata: {},
          name: input.name,
        })
        .returning();

      if (!role) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Role creation failed',
        });
      }

      if (input.permissionIds.length > 0) {
        await ctx.serverDB
          .insert(rolePermissions)
          .values(
            input.permissionIds.map((permissionId) => ({
              permissionId,
              roleId: role.id,
            })),
          )
          .onConflictDoNothing();
      }

      return role;
    }),

  createUser: rbacProcedure.input(createUserInputSchema).mutation(async ({ ctx, input }) => {
    const currentUser = await requireAnyPermission(ctx.serverDB, ctx.rbacModel, ctx.userId, [
      RBAC_PERMISSIONS.USER_CREATE_ALL,
    ]);

    const roleIds = await resolveNewUserRoleIds(ctx.serverDB, input.roleIds);
    if (roleIds.length > 0) {
      const selectedRoles = await ctx.serverDB.query.roles.findMany({
        where: inArray(roles.id, roleIds),
      });

      if (
        selectedRoles.some((role) => role.name === SUPER_ADMIN_ROLE) &&
        !isEnvSuperAdmin(currentUser.email)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only env super admins can create another Super Admin',
        });
      }
    }

    const existingUser = await ctx.serverDB.query.users.findFirst({
      where: eq(users.email, input.email),
    });
    if (existingUser) {
      throw new TRPCError({ code: 'CONFLICT', message: 'A user with this email already exists' });
    }

    const name = input.name || input.email.split('@')[0] || input.email;

    try {
      const result = await auth.api.createUser({
        body: {
          data: {
            emailVerified: true,
          },
          email: input.email,
          name,
          password: input.password,
          role: 'user',
        },
      });

      const user = result.user;
      if (!user?.id) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'User creation failed',
        });
      }

      if (roleIds.length > 0) {
        await ctx.rbacModel.updateUserRoles(user.id, roleIds);
      }

      return {
        roleIds,
        success: true,
        user: {
          email: user.email,
          fullName: user.name,
          id: user.id,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error('[rbacAdmin:createUser]', error);
      throw new TRPCError({
        cause: error,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create user',
      });
    }
  }),

  deleteRole: rbacProcedure
    .input(z.object({ roleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireAnyPermission(ctx.serverDB, ctx.rbacModel, ctx.userId, [
        RBAC_PERMISSIONS.RBAC_ROLE_DELETE_ALL,
      ]);

      const role = await ctx.serverDB.query.roles.findFirst({
        where: eq(roles.id, input.roleId),
      });

      if (!role) throw new TRPCError({ code: 'NOT_FOUND', message: 'Role not found' });
      if (role.isSystem) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'System roles cannot be deleted' });
      }

      await ctx.serverDB.delete(roles).where(eq(roles.id, input.roleId));
      return { success: true };
    }),

  getCurrentPermissions: rbacProcedure.query(async ({ ctx }) => {
    await ensureDefaultRbac(ctx.serverDB);
    await assignEnvSuperAdminRoles(ctx.serverDB);

    const user = await getCurrentUser(ctx.serverDB, ctx.userId);
    if (isEnvSuperAdmin(user.email)) {
      return {
        isAdmin: true,
        isEnvSuperAdmin: true,
        permissions: SUPER_ADMIN_PERMISSIONS,
        roles: [SUPER_ADMIN_ROLE],
      };
    }

    await assignDefaultUserRole(ctx.serverDB, ctx.userId);

    const [permissionCodes, roleRows] = await Promise.all([
      ctx.rbacModel.getUserPermissions(),
      ctx.rbacModel.getUserRoles(),
    ]);

    return {
      isAdmin: permissionCodes.some((code) => code.startsWith('rbac:') || code === 'user:read:all'),
      isEnvSuperAdmin: false,
      permissions: permissionCodes,
      roles: roleRows.map((role) => role.name),
    };
  }),

  listPermissions: rbacProcedure.query(async ({ ctx }) => {
    await requireRbacAdmin(ctx.serverDB, ctx.rbacModel, ctx.userId);

    return ctx.serverDB.query.permissions.findMany({
      orderBy: [asc(permissions.category), asc(permissions.code)],
    });
  }),

  listRoles: rbacProcedure.query(async ({ ctx }) => {
    await requireRbacAdmin(ctx.serverDB, ctx.rbacModel, ctx.userId);

    const [roleRows, rolePermissionRows] = await Promise.all([
      ctx.serverDB.query.roles.findMany({ orderBy: [asc(roles.isSystem), asc(roles.name)] }),
      ctx.serverDB.select().from(rolePermissions),
    ]);

    return roleRows.map((role) => ({
      ...role,
      permissionIds: rolePermissionRows
        .filter((item) => item.roleId === role.id)
        .map((item) => item.permissionId),
    }));
  }),

  listUsers: rbacProcedure
    .input(z.object({ q: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      await requireRbacAdmin(ctx.serverDB, ctx.rbacModel, ctx.userId);

      const q = input?.q?.trim();
      const where = q
        ? or(
            ilike(users.email, `%${q}%`),
            ilike(users.username, `%${q}%`),
            ilike(users.fullName, `%${q}%`),
          )
        : undefined;

      const [userRows, roleRows, userRoleRows] = await Promise.all([
        ctx.serverDB.query.users.findMany({
          columns: {
            avatar: true,
            banned: true,
            createdAt: true,
            email: true,
            fullName: true,
            id: true,
            lastActiveAt: true,
            username: true,
          },
          limit: 200,
          orderBy: [asc(users.email)],
          where,
        }),
        ctx.serverDB.query.roles.findMany(),
        ctx.serverDB.select().from(userRoles),
      ]);

      const rolesById = new Map(roleRows.map((role) => [role.id, role]));

      return userRows.map((user) => {
        const assignedRoleIds = userRoleRows
          .filter((item) => item.userId === user.id)
          .map((item) => item.roleId);

        return {
          ...user,
          isEnvSuperAdmin: isEnvSuperAdmin(user.email),
          roleIds: assignedRoleIds,
          roles: assignedRoleIds.map((roleId) => rolesById.get(roleId)).filter(isDefined),
        };
      });
    }),

  updateRolePermissions: rbacProcedure
    .input(z.object({ permissionIds: z.array(z.string()), roleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireAnyPermission(ctx.serverDB, ctx.rbacModel, ctx.userId, [
        RBAC_PERMISSIONS.RBAC_ROLE_UPDATE_ALL,
      ]);

      const role = await ctx.serverDB.query.roles.findFirst({
        where: eq(roles.id, input.roleId),
      });

      if (!role) throw new TRPCError({ code: 'NOT_FOUND', message: 'Role not found' });
      if (role.name === SUPER_ADMIN_ROLE) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Super Admin permissions are fixed',
        });
      }

      await ctx.serverDB.transaction(async (tx) => {
        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, input.roleId));

        if (input.permissionIds.length > 0) {
          await tx
            .insert(rolePermissions)
            .values(
              input.permissionIds.map((permissionId) => ({
                permissionId,
                roleId: input.roleId,
              })),
            )
            .onConflictDoNothing();
        }
      });

      return { success: true };
    }),

  updateUserRoles: rbacProcedure
    .input(z.object({ roleIds: z.array(z.string()), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await requireAnyPermission(ctx.serverDB, ctx.rbacModel, ctx.userId, [
        RBAC_PERMISSIONS.RBAC_USER_ROLE_UPDATE_ALL,
      ]);

      const targetUser = await ctx.serverDB.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!targetUser) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      if (isEnvSuperAdmin(targetUser.email)) {
        const superAdmin = await ctx.serverDB.query.roles.findFirst({
          where: eq(roles.name, SUPER_ADMIN_ROLE),
        });

        if (superAdmin && !input.roleIds.includes(superAdmin.id)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Env super admin role cannot be removed',
          });
        }
      }

      if (!isEnvSuperAdmin(currentUser.email) && input.roleIds.length > 0) {
        const selectedRoles = await ctx.serverDB.query.roles.findMany({
          where: inArray(roles.id, input.roleIds),
        });

        if (selectedRoles.some((role) => role.name === SUPER_ADMIN_ROLE)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only env super admins can assign the Super Admin role',
          });
        }
      }

      await ctx.rbacModel.updateUserRoles(input.userId, input.roleIds);
      return { success: true };
    }),
});

export type RbacAdminRouter = typeof rbacAdminRouter;
