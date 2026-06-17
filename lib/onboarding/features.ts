import {
  ALL_FEATURE_AREAS,
  FEATURE_AREA_CONFIG,
  type FeatureAreaConfig,
} from './constants';
import type {
  FeatureAreaId,
  LifeAreaId,
  OnboardingAnswers,
  PrimaryObjectiveId,
  ProfileTagId,
} from './types';

const PRIMARY_TO_FEATURES: Record<PrimaryObjectiveId, FeatureAreaId[]> = {
  control_spending: ['spending'],
  save_more: ['goals', 'spending'],
  track_wealth: ['wealth', 'spending'],
  receipts_warranties: ['receipts', 'spending'],
  subscriptions: ['subscriptions', 'spending'],
  organize_credits: ['credits', 'spending'],
};

const PROFILE_TO_FEATURES: Partial<Record<ProfileTagId, FeatureAreaId[]>> = {
  control_spending: ['spending'],
  receipts_warranties: ['receipts'],
  track_wealth: ['wealth'],
  financial_goals: ['goals'],
  credits_costs: ['credits'],
};

const LIFE_AREA_TO_FEATURES: Partial<Record<LifeAreaId, FeatureAreaId[]>> = {
  subscriptions: ['subscriptions'],
  credits: ['credits'],
  savings_goals: ['goals'],
  investments: ['wealth'],
  keeps_receipts: ['receipts'],
  own_home: ['wealth'],
  car: ['wealth'],
  online_shopping: ['receipts', 'spending'],
};

export function computeEnabledFeatures(answers: OnboardingAnswers): FeatureAreaId[] {
  const enabled = new Set<FeatureAreaId>();

  if (answers.primaryObjective) {
    for (const feature of PRIMARY_TO_FEATURES[answers.primaryObjective]) {
      enabled.add(feature);
    }
  }

  for (const tag of answers.profileTags) {
    for (const feature of PROFILE_TO_FEATURES[tag] ?? []) {
      enabled.add(feature);
    }
  }

  for (const area of answers.lifeAreas) {
    for (const feature of LIFE_AREA_TO_FEATURES[area] ?? []) {
      enabled.add(feature);
    }
  }

  if (answers.hasDebt === true) {
    enabled.add('credits');
  }

  if (answers.hasSavings === true || answers.ambitions.includes('more_savings')) {
    enabled.add('goals');
  }

  if (enabled.size === 0) {
    enabled.add('spending');
  }

  return ALL_FEATURE_AREAS.filter((id) => enabled.has(id));
}

export type FeatureRevealCard = FeatureAreaConfig & {
  status: 'active' | 'available';
};

export function getFeatureRevealCards(answers: OnboardingAnswers): FeatureRevealCard[] {
  const enabled = new Set(computeEnabledFeatures(answers));

  return ALL_FEATURE_AREAS.map((id) => ({
    ...FEATURE_AREA_CONFIG[id],
    status: enabled.has(id) ? 'active' : 'available',
  }));
}

export function enrichOnboardingAnswers(answers: OnboardingAnswers): OnboardingAnswers {
  return {
    ...answers,
    enabledFeatures: computeEnabledFeatures(answers),
  };
}

/** Prefill suave quando o utilizador escolhe o objetivo principal. */
export function hintsFromPrimaryObjective(
  objective: PrimaryObjectiveId,
  current: OnboardingAnswers,
): Partial<OnboardingAnswers> {
  const patch: Partial<OnboardingAnswers> = { primaryObjective: objective };

  if (current.profileTags.length === 0) {
    const tagMap: Partial<Record<PrimaryObjectiveId, ProfileTagId>> = {
      control_spending: 'control_spending',
      save_more: 'financial_goals',
      track_wealth: 'track_wealth',
      receipts_warranties: 'receipts_warranties',
      organize_credits: 'credits_costs',
    };
    const tag = tagMap[objective];
    if (tag) patch.profileTags = [tag];
  }

  if (current.lifeAreas.length === 0) {
    const areaMap: Partial<Record<PrimaryObjectiveId, LifeAreaId[]>> = {
      save_more: ['savings_goals'],
      subscriptions: ['subscriptions'],
      organize_credits: ['credits'],
      receipts_warranties: ['keeps_receipts'],
      track_wealth: ['investments'],
    };
    const areas = areaMap[objective];
    if (areas) patch.lifeAreas = areas;
  }

  return patch;
}

export function isFeatureActive(
  answers: OnboardingAnswers | null | undefined,
  feature: FeatureAreaId,
): boolean {
  if (!answers?.completed) return true;
  const features =
    answers.enabledFeatures.length > 0
      ? answers.enabledFeatures
      : computeEnabledFeatures(answers);
  return features.includes(feature);
}

export function withActivatedFeature(
  answers: OnboardingAnswers,
  feature: FeatureAreaId,
): OnboardingAnswers {
  const current = new Set<FeatureAreaId>(
    answers.enabledFeatures.length > 0
      ? answers.enabledFeatures
      : computeEnabledFeatures(answers),
  );
  current.add(feature);

  return {
    ...answers,
    enabledFeatures: ALL_FEATURE_AREAS.filter((id) => current.has(id)),
  };
}

export const TAB_FEATURE_MAP = {
  credits: 'credits' as FeatureAreaId,
  subscriptions: 'subscriptions' as FeatureAreaId,
  goals: 'goals' as FeatureAreaId,
  warranties: 'receipts' as FeatureAreaId,
  inventory: 'wealth' as FeatureAreaId,
};
