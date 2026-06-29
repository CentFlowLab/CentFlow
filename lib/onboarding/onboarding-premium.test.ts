import assert from 'node:assert/strict';
import test from 'node:test';

import { PRIMARY_OBJECTIVE_OPTIONS } from '@/lib/onboarding/constants';
import {
  getProgressLabel,
  getStepLabel,
  PLAN_LOADING_STAGES,
  PRIMARY_OBJECTIVE_REWARD,
  QUESTION_STEPS,
  STEP_REASONS,
} from '@/lib/onboarding/copy';
import { computeEnabledFeatures } from '@/lib/onboarding/features';
import {
  getOnboardingValueEstimate,
  getPrimaryObjectiveSummary,
} from '@/lib/onboarding/personalization';
import { EMPTY_ONBOARDING_ANSWERS, type PrimaryObjectiveId } from '@/lib/onboarding/types';

const PRIMARY_OBJECTIVE_IDS = PRIMARY_OBJECTIVE_OPTIONS.map((o) => o.id);

test('cada objetivo principal tem recompensa imediata', () => {
  for (const id of PRIMARY_OBJECTIVE_IDS) {
    assert.ok(
      PRIMARY_OBJECTIVE_REWARD[id] && PRIMARY_OBJECTIVE_REWARD[id].length > 0,
      `falta recompensa para ${id}`,
    );
  }
});

test('cada passo-pergunta tem razão (porquê + desbloqueia)', () => {
  for (const step of QUESTION_STEPS) {
    const reason = STEP_REASONS[step];
    assert.ok(reason, `falta razão para ${step}`);
    assert.ok(reason!.why.length > 0, `why vazio em ${step}`);
    assert.ok(reason!.unlocks.length > 0, `unlocks vazio em ${step}`);
  }
});

test('getStepLabel numera só os passos-pergunta', () => {
  assert.equal(getStepLabel('primary_objective'), 'Passo 1 de 6');
  assert.equal(getStepLabel('smart_config'), 'Passo 6 de 6');
  assert.equal(getStepLabel('welcome'), undefined);
  assert.equal(getStepLabel('reveal'), undefined);
  assert.equal(getStepLabel('wow'), undefined);
});

test('getProgressLabel varia com o progresso', () => {
  assert.equal(getProgressLabel(10), 'A criar o teu espaço financeiro');
  assert.equal(getProgressLabel(50), 'A personalizar a tua experiência');
  assert.equal(getProgressLabel(70), 'A ativar as funcionalidades certas');
  assert.equal(getProgressLabel(95), 'A finalizar o teu plano');
});

test('loading do plano tem várias etapas (sensação de valor)', () => {
  assert.ok(PLAN_LOADING_STAGES.length >= 3);
});

test('getOnboardingValueEstimate devolve sempre conteúdo, por objetivo', () => {
  const base = { ...EMPTY_ONBOARDING_ANSWERS };
  const fallback = getOnboardingValueEstimate(base);
  assert.ok(fallback.headline.length > 0 && fallback.detail.length > 0);

  for (const id of PRIMARY_OBJECTIVE_IDS) {
    const estimate = getOnboardingValueEstimate({ ...base, primaryObjective: id });
    assert.ok(estimate.headline.length > 0, `headline vazio para ${id}`);
    assert.ok(estimate.detail.length > 0, `detail vazio para ${id}`);
    assert.ok(estimate.emoji.length > 0, `emoji vazio para ${id}`);
  }
});

test('estimativa prioriza créditos quando há dívida', () => {
  const estimate = getOnboardingValueEstimate({
    ...EMPTY_ONBOARDING_ANSWERS,
    primaryObjective: 'control_spending',
    hasDebt: true,
  });
  assert.match(estimate.headline.toLowerCase(), /crédito/);
});

test('getPrimaryObjectiveSummary reflecte o objetivo escolhido', () => {
  assert.equal(getPrimaryObjectiveSummary({ ...EMPTY_ONBOARDING_ANSWERS }), null);

  const summary = getPrimaryObjectiveSummary({
    ...EMPTY_ONBOARDING_ANSWERS,
    primaryObjective: 'save_more',
  });
  assert.ok(summary);
  assert.equal(summary!.label, 'Poupar mais');
  assert.ok(summary!.emoji.length > 0);
});

test('personalização preservada: objetivo activa funcionalidades certas', () => {
  const objectiveFeatureChecks: Array<[PrimaryObjectiveId, string]> = [
    ['control_spending', 'spending'],
    ['save_more', 'goals'],
    ['track_wealth', 'wealth'],
    ['receipts_warranties', 'receipts'],
    ['subscriptions', 'subscriptions'],
    ['organize_credits', 'credits'],
  ];

  for (const [objective, feature] of objectiveFeatureChecks) {
    const features = computeEnabledFeatures({
      ...EMPTY_ONBOARDING_ANSWERS,
      primaryObjective: objective,
    });
    assert.ok(
      features.includes(feature as (typeof features)[number]),
      `${objective} devia ativar ${feature}`,
    );
  }
});
