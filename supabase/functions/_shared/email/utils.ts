import type { LifecycleEmailType } from './types.ts';

const LIFECYCLE_TYPES = new Set<LifecycleEmailType>([
  'welcome',
  'onboarding_incomplete',
  'first_step_missing',
  'inactive_7d',
  'inactive_30d',
]);

export function buildDeepLink(path: string): string {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `centflow://${normalized}`;
}

export function canSendByPreferences(
  type: LifecycleEmailType,
  prefs: {
    email_important: boolean;
    email_weekly_digest: boolean;
    email_warranty_alerts: boolean;
    email_subscription_renewals: boolean;
    email_credit_payments: boolean;
    email_tips_insights: boolean;
  },
): boolean {
  switch (type) {
    case 'welcome':
      return true;
    case 'onboarding_incomplete':
    case 'first_step_missing':
    case 'inactive_7d':
    case 'inactive_30d':
      return prefs.email_important;
    case 'weekly_digest':
      return prefs.email_weekly_digest;
    case 'warranty_expiring':
      return prefs.email_warranty_alerts;
    case 'subscription_renewal':
      return prefs.email_subscription_renewals;
    case 'credit_payment_due':
      return prefs.email_credit_payments;
    default:
      return prefs.email_tips_insights;
  }
}

export function isLifecycleEmail(type: LifecycleEmailType): boolean {
  return LIFECYCLE_TYPES.has(type);
}

export function getFirstStepPath(primaryObjective: string | null): string {
  switch (primaryObjective) {
    case 'save_more':
      return 'ativos?action=new-goal';
    case 'receipts_warranties':
      return 'movimentos?action=receipt';
    case 'subscriptions':
      return 'movimentos?action=new-subscription&view=subscricoes';
    case 'organize_credits':
      return 'precos';
    case 'track_wealth':
      return 'ativos?action=new-asset';
    default:
      return 'movimentos?action=new-movement';
  }
}

export function getFirstStepSuggestion(primaryObjective: string | null): string {
  switch (primaryObjective) {
    case 'save_more':
      return 'Cria o teu primeiro objetivo';
    case 'receipts_warranties':
      return 'Digitaliza o teu primeiro talão';
    case 'subscriptions':
      return 'Adiciona a tua primeira subscrição';
    case 'organize_credits':
      return 'Regista o teu primeiro crédito';
    case 'track_wealth':
      return 'Regista o teu primeiro activo';
    default:
      return 'Regista o teu primeiro movimento';
  }
}
