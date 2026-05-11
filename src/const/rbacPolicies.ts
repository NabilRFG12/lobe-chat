import { APP_PERMISSIONS } from '@/const/appPermissions';
import { RBAC_PERMISSIONS } from '@/const/rbac';
import { SettingsTabs, SidebarTabKey } from '@/store/global/initialState';

export const NAV_PERMISSION_REQUIREMENTS: Partial<
  Record<SidebarTabKey | string, readonly string[]>
> = {
  [SidebarTabKey.Chat]: [APP_PERMISSIONS.CHAT],
  [SidebarTabKey.Community]: [APP_PERMISSIONS.COMMUNITY],
  [SidebarTabKey.Image]: [APP_PERMISSIONS.IMAGE_GENERATION],
  [SidebarTabKey.Memory]: [APP_PERMISSIONS.MEMORY],
  [SidebarTabKey.Pages]: [APP_PERMISSIONS.PAGES],
  [SidebarTabKey.Resource]: [APP_PERMISSIONS.RESOURCE],
  [SidebarTabKey.Tasks]: [APP_PERMISSIONS.TASKS],
  [SidebarTabKey.Video]: [APP_PERMISSIONS.VIDEO_GENERATION],
  agent: [APP_PERMISSIONS.CHAT],
  community: [APP_PERMISSIONS.COMMUNITY],
  image: [APP_PERMISSIONS.IMAGE_GENERATION],
  memory: [APP_PERMISSIONS.MEMORY],
  pages: [APP_PERMISSIONS.PAGES],
  recents: [APP_PERMISSIONS.CHAT],
  resource: [APP_PERMISSIONS.RESOURCE],
  tasks: [APP_PERMISSIONS.TASKS],
  video: [APP_PERMISSIONS.VIDEO_GENERATION],
};

export const SETTINGS_PERMISSION_REQUIREMENTS: Partial<Record<SettingsTabs, readonly string[]>> = {
  [SettingsTabs.APIKey]: [RBAC_PERMISSIONS.API_KEY_READ_ALL, RBAC_PERMISSIONS.API_KEY_READ_OWNER],
  [SettingsTabs.Advanced]: [APP_PERMISSIONS.SETTINGS],
  [SettingsTabs.Creds]: [RBAC_PERMISSIONS.API_KEY_READ_ALL, RBAC_PERMISSIONS.API_KEY_READ_OWNER],
  [SettingsTabs.Memory]: [APP_PERMISSIONS.MEMORY],
  [SettingsTabs.Messenger]: [APP_PERMISSIONS.SETTINGS],
  [SettingsTabs.Provider]: [
    RBAC_PERMISSIONS.AI_PROVIDER_READ_ALL,
    RBAC_PERMISSIONS.AI_MODEL_READ_ALL,
  ],
  [SettingsTabs.Proxy]: [APP_PERMISSIONS.SETTINGS],
  [SettingsTabs.Roles]: [RBAC_PERMISSIONS.RBAC_ROLE_READ_ALL],
  [SettingsTabs.Security]: [RBAC_PERMISSIONS.USER_UPDATE_ALL, RBAC_PERMISSIONS.USER_UPDATE_OWNER],
  [SettingsTabs.ServiceModel]: [
    RBAC_PERMISSIONS.AI_MODEL_READ_ALL,
    RBAC_PERMISSIONS.AI_PROVIDER_READ_ALL,
  ],
  [SettingsTabs.Skill]: [APP_PERMISSIONS.SETTINGS],
  [SettingsTabs.Stats]: [RBAC_PERMISSIONS.USER_READ_ALL, RBAC_PERMISSIONS.USER_READ_OWNER],
  [SettingsTabs.Storage]: [APP_PERMISSIONS.RESOURCE],
  [SettingsTabs.SystemTools]: [APP_PERMISSIONS.SYSTEM_TOOLS],
  [SettingsTabs.Users]: [RBAC_PERMISSIONS.USER_READ_ALL, RBAC_PERMISSIONS.RBAC_USER_ROLE_READ_ALL],
};

export const getNavRequiredPermissions = (key: string) => NAV_PERMISSION_REQUIREMENTS[key];

export const getSettingsTabRequiredPermissions = (tab: SettingsTabs | string) =>
  SETTINGS_PERMISSION_REQUIREMENTS[tab as SettingsTabs];
