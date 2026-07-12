/** Código ISO 4217 (ex.: EUR, USD). */
export type SupportedCurrency = string;

/** Código ISO 3166-1 alpha-2 (ex.: PT, BR). */
export type UserRegion = string;

export type ThemeId = 'classic' | 'midnight-indigo' | 'warm-graphite' | 'deep-emerald';

export type UserPreferences = {
  pushNotifications: boolean;
  warrantyAlerts: boolean;
  budgetAlerts: boolean;
  /** Alerta quando um gasto ultrapassa a mediana histórica da categoria. */
  categorySpendAlerts: boolean;
  /** Multiplicador sobre a mediana (1,5× a 3×). */
  categorySpendAlertThreshold: number;
  weeklyDigest: boolean;
  emailImportant: boolean;
  emailWeeklyDigest: boolean;
  emailWarrantyAlerts: boolean;
  emailSubscriptionRenewals: boolean;
  emailCreditPayments: boolean;
  emailTipsInsights: boolean;
  region: UserRegion;
  themeId: ThemeId;
  biometricsEnabled: boolean;
  /** Quando true, sugestões favorecem amortizar dívida em vez de alocar a objetivos. */
  prioritizeDebtAmortization: boolean;
  /** Regras do motor de recomendações determinísticas (todas activas por defeito). */
  recommendationDebtVsInvestment: boolean;
  recommendationSurplusAllocation: boolean;
  recommendationCategoryMedian: boolean;
  recommendationEmergencyFund: boolean;
  recommendationHabitInsight: boolean;
};

export type UpdateProfileInput = {
  name: string;
  email?: string;
};

export type UpdateProfileResult = {
  name: string;
  email: string;
};

export type ChangePasswordInput = {
  newPassword: string;
};

export type ActiveSessionInfo = {
  count: number;
  currentDeviceLabel: string;
};
