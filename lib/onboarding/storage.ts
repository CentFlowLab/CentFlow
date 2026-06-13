import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { EMPTY_ONBOARDING_ANSWERS, type OnboardingAnswers } from './types';

const ANSWERS_KEY_PREFIX = 'centflow_onboarding_answers_';

const memoryStore = new Map<string, OnboardingAnswers>();

function answersKey(userId: string) {
  return `${ANSWERS_KEY_PREFIX}${userId}`;
}

export async function loadOnboardingAnswers(userId: string): Promise<OnboardingAnswers> {
  if (Platform.OS === 'web') {
    return memoryStore.get(userId) ?? { ...EMPTY_ONBOARDING_ANSWERS };
  }

  try {
    const raw = await SecureStore.getItemAsync(answersKey(userId));
    if (!raw) return { ...EMPTY_ONBOARDING_ANSWERS };
    return { ...EMPTY_ONBOARDING_ANSWERS, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_ONBOARDING_ANSWERS };
  }
}

export async function saveOnboardingAnswers(
  userId: string,
  answers: OnboardingAnswers,
): Promise<void> {
  if (Platform.OS === 'web') {
    memoryStore.set(userId, answers);
    return;
  }

  await SecureStore.setItemAsync(answersKey(userId), JSON.stringify(answers));
}

export async function getOnboardingCompleted(userId: string): Promise<boolean> {
  const answers = await loadOnboardingAnswers(userId);
  return answers.completed;
}

export async function setOnboardingCompleted(userId: string): Promise<void> {
  const current = await loadOnboardingAnswers(userId);
  await saveOnboardingAnswers(userId, {
    ...current,
    completed: true,
    completedAt: new Date().toISOString(),
  });
}
