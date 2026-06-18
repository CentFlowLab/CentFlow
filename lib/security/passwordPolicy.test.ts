import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isPasswordStrongEnough,
  scorePasswordStrength,
  validatePassword,
} from './passwordPolicy';

describe('passwordPolicy', () => {
  it('rejects common weak passwords', () => {
    assert.equal(isPasswordStrongEnough('12345678'), false);
    assert.equal(isPasswordStrongEnough('password'), false);
    assert.equal(isPasswordStrongEnough('centflow123'), false);
  });

  it('rejects password similar to email', () => {
    const result = validatePassword('TestUser@mail.com!', {
      email: 'testuser@mail.com',
    });
    assert.equal(result.valid, false);
  });

  it('accepts strong password', () => {
    const password = 'CentFlow!2026Secure';
    const result = validatePassword(password, { email: 'user@example.com', name: 'User' });
    assert.equal(result.valid, true);
    assert.ok(['strong', 'very_strong'].includes(scorePasswordStrength(password)));
  });

  it('requires minimum length of 12', () => {
    assert.equal(isPasswordStrongEnough('Aa1!short'), false);
  });
});
