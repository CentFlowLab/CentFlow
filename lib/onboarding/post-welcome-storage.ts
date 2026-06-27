import { readUserJson, writeUserJson } from '@/lib/storage/local-flags';

const SCOPE = 'post_onboarding_welcome_dismissed';

export async function isPostOnboardingWelcomeDismissed(userId: string): Promise<boolean> {
  const value = await readUserJson<boolean>(SCOPE, userId);
  return value === true;
}

export async function dismissPostOnboardingWelcome(userId: string): Promise<void> {
  await writeUserJson(SCOPE, userId, true);
}
