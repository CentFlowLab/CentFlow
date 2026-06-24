export {
  buildEmailDeepLink,
  resolveEmailDeepLinkRoute,
  getFirstStepDeepLink,
  EMAIL_DEEP_LINK_SCHEME,
  type EmailDeepLinkTarget,
} from './deep-links';

export {
  EMAIL_TYPE_LABELS,
  EMAIL_STATUS_LABELS,
  type LifecycleEmailType,
  type EmailEventStatus,
  type EmailPreferences,
  type EmailProviderStatus,
} from './types';

export { fetchEmailProviderStatus, describeEmailProviderStatus } from './provider-status';
export { invokeTestEmail, isEmailDevToolsEnabled, type TestEmailOptions, type TestEmailResult } from './dev-tools';
export { fetchEmailEvents, type EmailEventRow } from './events.service';
export { triggerLifecycleEmail, triggerWelcomeEmail } from './trigger';
