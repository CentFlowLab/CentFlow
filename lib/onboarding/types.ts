export type ProfileTagId =
  | 'control_spending'
  | 'receipts_warranties'
  | 'track_wealth'
  | 'financial_goals'
  | 'credits_costs'
  | 'still_exploring';

export type LifeAreaId =
  | 'own_home'
  | 'car'
  | 'credits'
  | 'online_shopping'
  | 'subscriptions'
  | 'investments'
  | 'savings_goals'
  | 'keeps_receipts';

export type IncomeAnswer = 'yes' | 'no' | 'prefer_not';

export type AmbitionId =
  | 'more_savings'
  | 'reduce_debt'
  | 'buy_home'
  | 'buy_car'
  | 'travel'
  | 'invest_more'
  | 'more_control'
  | 'other';

export type WowActionId =
  | 'first_receipt'
  | 'first_asset'
  | 'first_goal'
  | 'first_warranty'
  | 'first_movement'
  | 'first_subscription';

export type GenderId = 'male' | 'female' | 'neutral';

/** Curiosidade inicial — "sabes quanto podes gastar hoje?". */
export type SpendAwarenessId = 'yes' | 'no';

/** Histórico — já usaste alguma app financeira? */
export type FinancialHistoryId = 'never' | 'excel' | 'bank' | 'other_app' | 'paper';

/** Tipos de crédito assinalados no onboarding (passo Créditos). */
export type OnboardingCreditId = 'mortgage' | 'auto' | 'personal' | 'card';

/** Tipos de investimento assinalados no onboarding. */
export type OnboardingInvestmentId =
  | 'stocks'
  | 'etf'
  | 'crypto'
  | 'ppr'
  | 'funds'
  | 'real_estate'
  | 'none';

/** Objetivo principal escolhido no início da personalização. */
export type PrimaryObjectiveId =
  | 'control_spending'
  | 'save_more'
  | 'track_wealth'
  | 'receipts_warranties'
  | 'subscriptions'
  | 'organize_credits';

/** Áreas funcionais activadas com base no perfil (sem bloquear a app). */
export type FeatureAreaId =
  | 'spending'
  | 'goals'
  | 'wealth'
  | 'receipts'
  | 'subscriptions'
  | 'credits';

export type OnboardingStepId =
  | 'name'
  | 'welcome'
  | 'primary_objective'
  | 'profile'
  | 'life_areas'
  | 'ambition'
  | 'smart_config'
  | 'reveal'
  | 'wow';

export type OnboardingAnswers = {
  displayName: string;
  gender: GenderId | null;
  primaryObjective: PrimaryObjectiveId | null;
  profileTags: ProfileTagId[];
  lifeAreas: LifeAreaId[];
  hasMonthlyIncome: IncomeAnswer | null;
  hasSavings: boolean | null;
  hasDebt: boolean | null;
  smartConfigSkipped: boolean;
  ambitions: AmbitionId[];
  ambitionOther: string;
  enabledFeatures: FeatureAreaId[];
  firstAction: WowActionId | null;
  completed: boolean;
  completedAt: string | null;
  skipped: boolean;

  // --- Onboarding premium (campos opcionais, retrocompatíveis) ---
  /** Curiosidade inicial. */
  spendAwareness: SpendAwarenessId | null;
  /** Histórico financeiro. */
  financialHistory: FinancialHistoryId | null;
  /** Objetivo de poupança (€). */
  savingsGoal: number | null;
  /** Prazo do objetivo em meses. */
  savingsMonths: number | null;
  /** Rendimento mensal líquido (€) — privado. */
  monthlyIncome: number | null;
  /** Tipos de crédito assinalados. */
  creditTypes: OnboardingCreditId[];
  /** Tipos de investimento assinalados. */
  investmentTypes: OnboardingInvestmentId[];
};

export const EMPTY_ONBOARDING_ANSWERS: OnboardingAnswers = {
  displayName: '',
  gender: 'neutral',
  primaryObjective: null,
  profileTags: [],
  lifeAreas: [],
  hasMonthlyIncome: null,
  hasSavings: null,
  hasDebt: null,
  smartConfigSkipped: false,
  ambitions: [],
  ambitionOther: '',
  enabledFeatures: [],
  firstAction: null,
  completed: false,
  completedAt: null,
  skipped: false,
  spendAwareness: null,
  financialHistory: null,
  savingsGoal: null,
  savingsMonths: null,
  monthlyIncome: null,
  creditTypes: [],
  investmentTypes: [],
};
