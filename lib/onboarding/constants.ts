import type { AmbitionId, LifeAreaId, ProfileTagId, WowActionId } from './types';

export type SelectOption<T extends string> = {
  id: T;
  emoji: string;
  label: string;
  description?: string;
};

export const PROFILE_OPTIONS: SelectOption<ProfileTagId>[] = [
  {
    id: 'control_spending',
    emoji: '💳',
    label: 'Quero controlar melhor os meus gastos',
  },
  {
    id: 'receipts_warranties',
    emoji: '📄',
    label: 'Estou cansado de perder faturas e garantias',
  },
  {
    id: 'track_wealth',
    emoji: '📈',
    label: 'Quero acompanhar o meu património',
  },
  {
    id: 'financial_goals',
    emoji: '🎯',
    label: 'Tenho objetivos financeiros específicos',
  },
  {
    id: 'credits_costs',
    emoji: '🏠',
    label: 'Tenho créditos e quero perceber melhor os custos',
  },
  {
    id: 'still_exploring',
    emoji: '🤔',
    label: 'Ainda estou a descobrir',
  },
];

export const LIFE_AREA_OPTIONS: SelectOption<LifeAreaId>[] = [
  { id: 'own_home', emoji: '🏠', label: 'Casa própria' },
  { id: 'car', emoji: '🚗', label: 'Automóvel' },
  { id: 'credits', emoji: '💳', label: 'Créditos' },
  { id: 'online_shopping', emoji: '📦', label: 'Compras frequentes online' },
  { id: 'subscriptions', emoji: '📱', label: 'Subscrições' },
  { id: 'investments', emoji: '📈', label: 'Investimentos' },
  { id: 'savings_goals', emoji: '🎯', label: 'Objetivos de poupança' },
  { id: 'keeps_receipts', emoji: '🧾', label: 'Guarda faturas / talões' },
];

export const AMBITION_OPTIONS: SelectOption<AmbitionId>[] = [
  { id: 'more_savings', emoji: '💰', label: 'Ter mais poupanças' },
  { id: 'reduce_debt', emoji: '📉', label: 'Reduzir dívida' },
  { id: 'buy_home', emoji: '🏠', label: 'Comprar casa' },
  { id: 'buy_car', emoji: '🚗', label: 'Comprar carro' },
  { id: 'travel', emoji: '✈️', label: 'Viajar' },
  { id: 'invest_more', emoji: '📈', label: 'Investir mais' },
  { id: 'more_control', emoji: '🎯', label: 'Ter maior controlo financeiro' },
  { id: 'other', emoji: '✨', label: 'Outro' },
];

export type WowCardConfig = {
  id: WowActionId;
  emoji: string;
  title: string;
  subtitle: string;
};

export const WOW_ACTION_CONFIG: Record<WowActionId, WowCardConfig> = {
  first_receipt: {
    id: 'first_receipt',
    emoji: '📄',
    title: 'Primeiro talão',
    subtitle: 'Digitaliza uma fatura e vê a magia do OCR',
  },
  first_asset: {
    id: 'first_asset',
    emoji: '🏠',
    title: 'Primeiro ativo',
    subtitle: 'Regista algo que possuis ou valorizas',
  },
  first_goal: {
    id: 'first_goal',
    emoji: '🎯',
    title: 'Primeiro objetivo',
    subtitle: 'Define uma meta de poupança concreta',
  },
  first_warranty: {
    id: 'first_warranty',
    emoji: '🛡️',
    title: 'Primeira garantia',
    subtitle: 'Guarda uma garantia para não a perder',
  },
};

export const STEP_PROGRESS: Record<string, number> = {
  name: 0,
  welcome: 12,
  profile: 25,
  life_areas: 40,
  smart_config: 55,
  ambition: 70,
  reveal: 85,
  wow: 95,
};
