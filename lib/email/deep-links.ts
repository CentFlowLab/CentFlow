import type { Href } from 'expo-router';

/** Base URL para CTAs em emails — abre a app via scheme centflow. */
export const EMAIL_DEEP_LINK_SCHEME = 'centflow';

export type EmailDeepLinkTarget =
  | 'home'
  | 'onboarding'
  | 'movement'
  | 'receipt'
  | 'goal'
  | 'warranty'
  | 'subscription'
  | 'credit'
  | 'weekly_summary';

const TARGET_TO_PATH: Record<EmailDeepLinkTarget, string> = {
  home: '/(tabs)/',
  onboarding: '/onboarding',
  movement: '/movimentos?action=new-movement',
  receipt: '/movimentos?action=receipt',
  goal: '/ativos?action=new-goal',
  warranty: '/ativos?action=new-warranty',
  subscription: '/movimentos?action=new-subscription&view=subscricoes',
  credit: '/creditos',
  weekly_summary: '/(tabs)/',
};

/** URL para usar em emails (Resend HTML). */
export function buildEmailDeepLink(target: EmailDeepLinkTarget): string {
  const path = TARGET_TO_PATH[target].replace(/^\//, '');
  return `${EMAIL_DEEP_LINK_SCHEME}://${path}`;
}

/** Rota expo-router equivalente (handler na app). */
export function resolveEmailDeepLinkRoute(url: string): Href | null {
  try {
    const normalized = url.replace(`${EMAIL_DEEP_LINK_SCHEME}://`, '');
    const path = normalized.startsWith('/') ? normalized : `/${normalized}`;

    if (path.startsWith('/onboarding')) return '/onboarding' as Href;
    if (path.startsWith('/movimentos')) return path as Href;
    if (path.startsWith('/ativos')) return path as Href;
    if (path.startsWith('/creditos')) return '/creditos' as Href;
    if (path === '/' || path.startsWith('/(tabs)')) return '/(tabs)/' as Href;

    return null;
  } catch {
    return null;
  }
}

export function getFirstStepDeepLink(primaryObjective: string | null): EmailDeepLinkTarget {
  switch (primaryObjective) {
    case 'save_more':
      return 'goal';
    case 'receipts_warranties':
      return 'receipt';
    case 'subscriptions':
      return 'subscription';
    case 'organize_credits':
      return 'credit';
    case 'track_wealth':
      return 'goal';
    default:
      return 'movement';
  }
}
