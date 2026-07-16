import type { PrivacyConsentRecord } from './consent.types';

let memoryCache: PrivacyConsentRecord | null | undefined;

export function getCachedPrivacyConsent(): PrivacyConsentRecord | null {
  return memoryCache ?? null;
}

export function isProductAnalyticsConsented(): boolean {
  return memoryCache?.productAnalytics === true;
}

export function isCrashReportingConsented(): boolean {
  return memoryCache?.crashReporting === true;
}

export function hasPrivacyConsentDecision(): boolean {
  return memoryCache != null;
}

export function setPrivacyConsentCache(record: PrivacyConsentRecord | null): void {
  memoryCache = record;
}

/** Para testes — repõe cache em memória. */
export function __setPrivacyConsentCacheForTests(
  record: PrivacyConsentRecord | null | undefined,
): void {
  memoryCache = record;
}
