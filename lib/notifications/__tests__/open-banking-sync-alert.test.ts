import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildConsentExpiryMessage,
  buildImportDigestMessage,
} from '@/lib/notifications/open-banking-sync-messages';

test('resume importação sem baixa confiança', () => {
  assert.equal(buildImportDigestMessage(5, 0), '5 novas transações importadas.');
});

test('resume importação com baixa confiança', () => {
  assert.equal(
    buildImportDigestMessage(5, 1),
    '5 novas transações importadas, 1 categorizada automaticamente com baixa confiança — revê quando puderes.',
  );
});

test('avisa consentimento a expirar', () => {
  assert.match(buildConsentExpiryMessage('Millennium BCP', 3), /expira em 3 dias/);
});
