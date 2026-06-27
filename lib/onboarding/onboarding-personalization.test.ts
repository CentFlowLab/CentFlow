import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveFirstAction } from '@/lib/onboarding/first-action';
import { getRankedQuickAddActions } from '@/lib/onboarding/quick-actions';
import { mergeHomeSuggestions } from '@/lib/onboarding/suggestions-bridge';
import { getPostOnboardingWelcome } from '@/lib/onboarding/welcome-priority';
import { EMPTY_ONBOARDING_ANSWERS } from '@/lib/onboarding/types';

describe('resolveFirstAction', () => {
  it('prioriza talão quando o objetivo é receipts_warranties', () => {
    const action = resolveFirstAction({
      ...EMPTY_ONBOARDING_ANSWERS,
      primaryObjective: 'receipts_warranties',
      profileTags: ['receipts_warranties'],
    });
    assert.equal(action, 'first_receipt');
  });

  it('prioriza objetivo quando save_more', () => {
    const action = resolveFirstAction({
      ...EMPTY_ONBOARDING_ANSWERS,
      primaryObjective: 'save_more',
      ambitions: ['more_savings'],
      profileTags: ['financial_goals'],
    });
    assert.equal(action, 'first_goal');
  });
});

describe('getRankedQuickAddActions', () => {
  it('coloca receipt primeiro para perfil de talões', () => {
    const ranked = getRankedQuickAddActions('home', {
      ...EMPTY_ONBOARDING_ANSWERS,
      completed: true,
      primaryObjective: 'receipts_warranties',
      profileTags: ['receipts_warranties'],
      firstAction: 'first_receipt',
    });
    assert.equal(ranked[0], 'receipt');
  });

  it('coloca credit primeiro quando há créditos no onboarding', () => {
    const ranked = getRankedQuickAddActions('home', {
      ...EMPTY_ONBOARDING_ANSWERS,
      completed: true,
      creditTypes: ['mortgage'],
      hasDebt: true,
      primaryObjective: 'organize_credits',
      firstAction: 'first_movement',
    });
    assert.ok(ranked.indexOf('credit') < ranked.indexOf('goal'));
  });
});

describe('getPostOnboardingWelcome', () => {
  it('gera CTA alinhado com firstAction', () => {
    const welcome = getPostOnboardingWelcome(
      {
        ...EMPTY_ONBOARDING_ANSWERS,
        completed: true,
        firstAction: 'first_goal',
        primaryObjective: 'save_more',
      },
      'Ana',
    );
    assert.match(welcome.title, /Ana/);
    assert.equal(welcome.action, 'goal');
    assert.match(welcome.message, /objetivo/i);
  });
});

describe('mergeHomeSuggestions', () => {
  it('prioriza sugestões personalizadas sobre genéricas', () => {
    const merged = mergeHomeSuggestions(
      [{ id: 'generic', title: 'Genérico', description: 'x', type: 'general' }],
      {
        ...EMPTY_ONBOARDING_ANSWERS,
        completed: true,
        profileTags: ['receipts_warranties'],
      },
    );
    assert.notEqual(merged[0]?.id, 'generic');
  });
});
