import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getSpendAwarenessRevealMessage,
  resolveAssistancePreferences,
} from '@/lib/onboarding/assistance';
import { EMPTY_ONBOARDING_ANSWERS } from '@/lib/onboarding/types';

describe('getSpendAwarenessRevealMessage', () => {
  it('responde de forma positiva quando o utilizador sabe quanto pode gastar', () => {
    const message = getSpendAwarenessRevealMessage('yes');
    assert.match(message, /Perfeito/i);
    assert.doesNotMatch(message, /Vamos descobrir/i);
  });

  it('convida à descoberta quando o utilizador não sabe', () => {
    const message = getSpendAwarenessRevealMessage('no');
    assert.match(message, /Vamos descobrir/i);
    assert.doesNotMatch(message, /Perfeito/i);
  });
});

describe('resolveAssistancePreferences', () => {
  it('dá mais assistência quando spendAwareness é no', () => {
    const prefs = resolveAssistancePreferences({
      ...EMPTY_ONBOARDING_ANSWERS,
      spendAwareness: 'no',
      financialHistory: 'never',
    });
    assert.equal(prefs.maxInsights, 3);
    assert.equal(prefs.showSavingsTip, true);
    assert.equal(prefs.verboseDescriptions, true);
  });

  it('reduz assistência quando spendAwareness é yes', () => {
    const prefs = resolveAssistancePreferences({
      ...EMPTY_ONBOARDING_ANSWERS,
      spendAwareness: 'yes',
      financialHistory: 'bank',
    });
    assert.equal(prefs.maxInsights, 1);
    assert.equal(prefs.showSavingsTip, false);
  });
});
