import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { getSupabaseClient, isSupabaseEnabled } from '@/lib/supabase';

import {
  getOnboardingCompleted,
  loadOnboardingAnswers,
  saveOnboardingAnswers,
} from './storage';
import { EMPTY_ONBOARDING_ANSWERS, type OnboardingAnswers } from './types';

type OnboardingRow = {
  user_id: string;
  completed: boolean;
  completed_at: string | null;
  skipped: boolean;
  answers: OnboardingAnswers;
};

function mapRow(row: OnboardingRow): OnboardingAnswers {
  return {
    ...EMPTY_ONBOARDING_ANSWERS,
    ...row.answers,
    completed: row.completed,
    completedAt: row.completed_at,
    skipped: row.skipped,
  };
}

async function fetchSupabaseAnswers(userId: string): Promise<OnboardingAnswers> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('onboarding_answers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (__DEV__) {
      console.warn('[onboarding] fetchSupabaseAnswers:', error.message);
    }
    throw new Error(error.message);
  }
  if (!data) return { ...EMPTY_ONBOARDING_ANSWERS };

  return mapRow(data as OnboardingRow);
}

async function upsertSupabaseAnswers(
  userId: string,
  answers: OnboardingAnswers,
): Promise<OnboardingAnswers> {
  const supabase = getSupabaseClient();

  const payload = {
    user_id: userId,
    completed: answers.completed,
    completed_at: answers.completedAt,
    skipped: answers.skipped,
    answers,
  };

  const { data, error } = await supabase
    .from('onboarding_answers')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as OnboardingRow);
}

export async function fetchOnboardingAnswers(userId: string): Promise<OnboardingAnswers> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    return loadOnboardingAnswers(userId);
  }

  try {
    return await fetchSupabaseAnswers(userId);
  } catch {
    return loadOnboardingAnswers(userId);
  }
}

export async function saveOnboardingAnswersForUser(
  userId: string,
  answers: OnboardingAnswers,
): Promise<OnboardingAnswers> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    await saveOnboardingAnswers(userId, answers);
    return answers;
  }

  try {
    return await upsertSupabaseAnswers(userId, answers);
  } catch {
    await saveOnboardingAnswers(userId, answers);
    return answers;
  }
}

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    return getOnboardingCompleted(userId);
  }

  try {
    const answers = await fetchSupabaseAnswers(userId);
    return answers.completed;
  } catch {
    return getOnboardingCompleted(userId);
  }
}
