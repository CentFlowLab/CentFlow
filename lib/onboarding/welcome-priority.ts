import { WOW_ACTION_CONFIG } from './constants';
import { resolveFirstAction } from './first-action';
import type { OnboardingAnswers } from './types';

export type PostOnboardingWelcomeAction =
  | 'movement'
  | 'receipt'
  | 'goal'
  | 'credit'
  | 'asset'
  | 'subscription'
  | 'warranty';

export type PostOnboardingWelcome = {
  emoji: string;
  title: string;
  message: string;
  ctaLabel: string;
  action: PostOnboardingWelcomeAction;
};

const ACTION_ROUTE: Record<PostOnboardingWelcomeAction, string> = {
  movement: '/(tabs)/movimentos?action=new-movement',
  receipt: '/(tabs)/movimentos?action=receipt',
  goal: '/(tabs)/ativos?action=new-goal',
  credit: '/(tabs)/precos?action=new-credit',
  asset: '/(tabs)/ativos?action=new-asset',
  subscription: '/(tabs)/movimentos?view=subscricoes&action=new-subscription',
  warranty: '/(tabs)/ativos?tab=garantias&action=new-warranty',
};

const WOW_TO_WELCOME: Record<string, PostOnboardingWelcomeAction> = {
  first_receipt: 'receipt',
  first_movement: 'movement',
  first_asset: 'asset',
  first_goal: 'goal',
  first_warranty: 'warranty',
  first_subscription: 'subscription',
};

export function getPostOnboardingWelcomeRoute(action: PostOnboardingWelcomeAction): string {
  return ACTION_ROUTE[action];
}

/** Cartão de primeiro arranque na Home — CTA alinhado com a prioridade do onboarding. */
export function getPostOnboardingWelcome(
  answers: OnboardingAnswers,
  firstName: string,
): PostOnboardingWelcome {
  const wowId = answers.firstAction ?? resolveFirstAction(answers);
  const config = WOW_ACTION_CONFIG[wowId];
  const action = WOW_TO_WELCOME[wowId] ?? 'movement';
  const hello = firstName ? `Olá, ${firstName}.` : 'Olá.';

  return {
    emoji: config.emoji,
    title: hello,
    message: `Com base nas tuas respostas, vamos começar por ${config.title.toLowerCase()}.`,
    ctaLabel: config.title,
    action,
  };
}
