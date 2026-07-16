import { secureStorage, SECURE_KEYS } from '@/lib/security/secureStorage';

import {
  getCachedPrivacyConsent,
  hasPrivacyConsentDecision,
  isCrashReportingConsented,
  isProductAnalyticsConsented,
  setPrivacyConsentCache,
  __setPrivacyConsentCacheForTests,
} from './consent.memory';
import {
  PRIVACY_CONSENT_VERSION,
  type PrivacyConsentRecord,
} from './consent.types';

export {
  getCachedPrivacyConsent,
  hasPrivacyConsentDecision,
  isCrashReportingConsented,
  isProductAnalyticsConsented,
  __setPrivacyConsentCacheForTests,
};

let loaded = false;

function parseRecord(raw: string | null): PrivacyConsentRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PrivacyConsentRecord;
    if (
      typeof parsed.version === 'string' &&
      typeof parsed.decidedAt === 'string' &&
      typeof parsed.productAnalytics === 'boolean' &&
      typeof parsed.crashReporting === 'boolean'
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export async function loadPrivacyConsent(): Promise<PrivacyConsentRecord | null> {
  if (loaded) {
    return getCachedPrivacyConsent();
  }
  loaded = true;
  const raw = await secureStorage.getItem(SECURE_KEYS.privacyConsent);
  const record = parseRecord(raw);
  setPrivacyConsentCache(record);
  return record;
}

export async function savePrivacyConsent(
  patch: Pick<PrivacyConsentRecord, 'productAnalytics' | 'crashReporting'>,
): Promise<PrivacyConsentRecord> {
  const record: PrivacyConsentRecord = {
    version: PRIVACY_CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    productAnalytics: patch.productAnalytics,
    crashReporting: patch.crashReporting,
  };
  await secureStorage.setItem(SECURE_KEYS.privacyConsent, JSON.stringify(record));
  setPrivacyConsentCache(record);
  loaded = true;
  return record;
}

export async function clearPrivacyConsent(): Promise<void> {
  await secureStorage.deleteItem(SECURE_KEYS.privacyConsent);
  setPrivacyConsentCache(null);
  loaded = true;
}
