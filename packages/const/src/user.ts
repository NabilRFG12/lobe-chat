import type { UserPreference } from '@lobechat/types';

/**
 * Current onboarding flow version.
 * Increment this value when the onboarding flow changes significantly,
 * which will trigger existing users to go through onboarding again.
 */
export const CURRENT_ONBOARDING_VERSION = 1;

// Disabled for the self-hosted fork for now. Keep the onboarding implementation
// in place so it can be re-enabled later by flipping this switch.
export const ONBOARDING_ENABLED = false;

export const DEFAULT_PREFERENCE: UserPreference = {
  guide: {
    moveSettingsToAvatar: true,
    topic: true,
  },
  lab: {
    enableAgentSelfIteration: false,
    enableInputMarkdown: true,
  },
  topicGroupMode: 'byTime',
  topicIncludeCompleted: false,
  topicSortBy: 'updatedAt',
  useCmdEnterToSend: false,
};
