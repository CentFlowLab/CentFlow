/** Tipos de email lifecycle — espelham o backend. */
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

export type EmailEventStatus = 'sent' | 'failed' | 'skipped' | 'preview';

export type EmailProviderStatus = {
  resendConfigured: boolean;
  cronConfigured: boolean;
  emailFromDomain: string;
  sandboxMode: boolean;
};

export type EmailPreferences = {
  emailImportant: boolean;
  emailWeeklyDigest: boolean;
  emailWarrantyAlerts: boolean;
  emailSubscriptionRenewals: boolean;
  emailCreditPayments: boolean;
  emailTipsInsights: boolean;
};

export const EMAIL_TYPE_LABELS: Record<LifecycleEmailType, string> = {
  welcome: 'Boas-vindas',
  onboarding_incomplete: 'Onboarding incompleto',
  first_step_missing: 'Primeiro passo em falta',
  inactive_7d: 'Inactivo 7 dias',
  inactive_30d: 'Inactivo 30 dias',
  warranty_expiring: 'Garantia a expirar',
  subscription_renewal: 'Subscrição a renovar',
  credit_payment_due: 'Prestação próxima',
  weekly_digest: 'Resumo semanal',
  tips_insight: 'Dicas e insights',
};

export const EMAIL_STATUS_LABELS: Record<EmailEventStatus, string> = {
  sent: 'Enviado',
  failed: 'Falhou',
  skipped: 'Ignorado',
  preview: 'Preview',
};
