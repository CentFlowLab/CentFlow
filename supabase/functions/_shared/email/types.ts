export type LifecycleEmailType =
  | 'welcome'
  | 'onboarding_incomplete'
  | 'first_step_missing'
  | 'inactive_7d'
  | 'inactive_30d'
  | 'warranty_expiring'
  | 'subscription_renewal'
  | 'credit_payment_due'
  | 'weekly_digest'
  | 'tips_insight';

export type EmailPreferences = {
  email_important: boolean;
  email_weekly_digest: boolean;
  email_warranty_alerts: boolean;
  email_subscription_renewals: boolean;
  email_credit_payments: boolean;
  email_tips_insights: boolean;
};

export type EmailUserContext = {
  userId: string;
  email: string;
  name: string;
  primaryObjective: string | null;
  onboardingCompleted: boolean;
  preferences: EmailPreferences;
};

export type EmailTemplatePayload = {
  subject: string;
  html: string;
  text: string;
  ctaUrl: string;
  ctaLabel: string;
};

export type SendEmailResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  providerMessageId?: string;
  error?: string;
};
