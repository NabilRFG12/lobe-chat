export const APP_PERMISSIONS = {
  CHAT: 'app:chat',
  COMMUNITY: 'app:community',
  IMAGE_GENERATION: 'app:image_generation',
  MEMORY: 'app:memory',
  PAGES: 'app:pages',
  RESOURCE: 'app:resource',
  SETTINGS: 'app:settings',
  SYSTEM_TOOLS: 'app:system_tools',
  TASKS: 'app:tasks',
  VIDEO_GENERATION: 'app:video_generation',
} as const;

export const APP_PERMISSION_DEFINITIONS = [
  {
    category: 'app',
    code: APP_PERMISSIONS.CHAT,
    description: 'Open and use agent chat',
    name: 'Use chat',
  },
  {
    category: 'app',
    code: APP_PERMISSIONS.TASKS,
    description: 'Open and use tasks',
    name: 'Use tasks',
  },
  {
    category: 'app',
    code: APP_PERMISSIONS.PAGES,
    description: 'Open and use pages',
    name: 'Use pages',
  },
  {
    category: 'app',
    code: APP_PERMISSIONS.COMMUNITY,
    description: 'Open and use community catalog pages',
    name: 'Use community',
  },
  {
    category: 'app',
    code: APP_PERMISSIONS.RESOURCE,
    description: 'Open and use resources and libraries',
    name: 'Use resources',
  },
  {
    category: 'app',
    code: APP_PERMISSIONS.MEMORY,
    description: 'Open and use memory pages',
    name: 'Use memory',
  },
  {
    category: 'app',
    code: APP_PERMISSIONS.IMAGE_GENERATION,
    description: 'Open and use image generation',
    name: 'Use image generation',
  },
  {
    category: 'app',
    code: APP_PERMISSIONS.VIDEO_GENERATION,
    description: 'Open and use video generation',
    name: 'Use video generation',
  },
  {
    category: 'app',
    code: APP_PERMISSIONS.SETTINGS,
    description: 'Open administrative settings screens',
    name: 'Manage settings',
  },
  {
    category: 'app',
    code: APP_PERMISSIONS.SYSTEM_TOOLS,
    description: 'Open system tools',
    name: 'Use system tools',
  },
] as const;

export const APP_PERMISSION_VALUES = Object.values(APP_PERMISSIONS);
