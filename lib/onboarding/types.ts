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

export type WowActionId = 'first_receipt' | 'first_asset' | 'first_goal' | 'first_warranty';

export type OnboardingStepId =
  | 'name'
  | 'welcome'
  | 'profile'
  | 'life_areas'
  | 'smart_config'
  | 'ambition'
  | 'reveal'
  | 'wow';

export type OnboardingAnswers = {
  displayName: string;
  profileTags: ProfileTagId[];
  lifeAreas: LifeAreaId[];
  hasMonthlyIncome: IncomeAnswer | null;
  hasSavings: boolean | null;
  hasDebt: boolean | null;
  ambitions: AmbitionId[];
  ambitionOther: string;
  firstAction: WowActionId | null;
  completed: boolean;
  completedAt: string | null;
  skipped: boolean;
};

export const EMPTY_ONBOARDING_ANSWERS: OnboardingAnswers = {
  displayName: '',
  profileTags: [],
  lifeAreas: [],
  hasMonthlyIncome: null,
  hasSavings: null,
  hasDebt: null,
  ambitions: [],
  ambitionOther: '',
  firstAction: null,
  completed: false,
  completedAt: null,
  skipped: false,
};
