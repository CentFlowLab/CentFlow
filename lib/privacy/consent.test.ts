import assert from 'node:assert/strict';
import test from 'node:test';

import {
  __setPrivacyConsentCacheForTests,
  isCrashReportingConsented,
  isProductAnalyticsConsented,
} from './consent.memory';
import type { PrivacyConsentRecord } from './consent.types';

function setConsent(partial: Partial<PrivacyConsentRecord>): void {
  __setPrivacyConsentCacheForTests({
    version: '1.0.0',
    decidedAt: '2026-07-13T12:00:00.000Z',
    productAnalytics: false,
    crashReporting: false,
    ...partial,
  });
}

test('consent — analytics e crash desactivados por defeito', () => {
  setConsent({});
  assert.equal(isProductAnalyticsConsented(), false);
  assert.equal(isCrashReportingConsented(), false);
});

test('consent — activa apenas analytics quando seleccionado', () => {
  setConsent({ productAnalytics: true });
  assert.equal(isProductAnalyticsConsented(), true);
  assert.equal(isCrashReportingConsented(), false);
});

test('consent — activa crash reporting independentemente', () => {
  setConsent({ crashReporting: true });
  assert.equal(isProductAnalyticsConsented(), false);
  assert.equal(isCrashReportingConsented(), true);
});
