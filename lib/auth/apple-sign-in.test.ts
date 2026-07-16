import assert from 'node:assert/strict';
import test from 'node:test';

import { isAppleSignInSupportedOnPlatform } from './apple-sign-in.platform';

test('isAppleSignInSupportedOnPlatform — true só para iOS', () => {
  assert.equal(isAppleSignInSupportedOnPlatform('ios'), true);
  assert.equal(isAppleSignInSupportedOnPlatform('android'), false);
  assert.equal(isAppleSignInSupportedOnPlatform('web'), false);
});
