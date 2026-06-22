import type {
  AmbitionId,
  FeatureAreaId,
  LifeAreaId,
  PrimaryObjectiveId,
  ProfileTagId,
  WowActionId,
} from './types';

export type SelectOption<T extends string> = {
  id: T;
  emoji: string;
  label: string;
  description?: string;
};

export const PRIMARY_OBJECTIVE_OPTIONS: SelectOption<PrimaryObjectiveId>[] = [
  {
    id: 'control_spending',
    emoji: '💳',
    label: 'Controlar gastos',
    description: 'Movimentos, categorias e análises',
  },
  {
    id: 'save_more',
    emoji: '🎯',
    label: 'Poupar mais',
    description: 'Objetivos, progresso e poupança',
  },
  {
    id: 'track_wealth',
    emoji: '📈',
    label: 'Acompanhar património',
    description: 'Ativos, inventário e valor patrimonial',
  },
  {
    id: 'receipts_warranties',
    emoji: '🧾',
    label: 'Guardar compras e garantias',
    description: 'Scanner, OCR e alertas',
  },
  {
    id: 'subscriptions',
    emoji: '📱',
    label: 'Gerir subscrições',
    description: 'Custos mensais e renovações',
  },
  {
    id: 'organize_credits',
    emoji: '🏦',
    label: 'Organizar créditos',
    description: 'Créditos, custos fixos e prestações',
  },
];

export type FeatureAreaConfig = {
  id: FeatureAreaId;
  emoji: string;
  label: string;
  description: string;
  activateHint: string;
};

export const FEATURE_AREA_CONFIG: Record<FeatureAreaId, FeatureAreaConfig> = {
  spending: {
    id: 'spending',
    emoji: '💳',
    label: 'Gastos',
    description: 'Movimentos, categorias e insights',
    activateHint: 'Activa para perceberes para onde vai o dinheiro',
  },
  goals: {
    id: 'goals',
    emoji: '🎯',
    label: 'Objetivos',
    description: 'Metas de poupança e progresso',
    activateHint: 'Activa para acompanhar as tuas metas',
  },
  wealth: {
    id: 'wealth',
    emoji: '📈',
    label: 'Património',
    description: 'Ativos, inventário e valor total',
    activateHint: 'Activa para acompanhar os teus bens',
  },
  receipts: {
    id: 'receipts',
    emoji: '🧾',
    label: 'Garantias',
    description: 'Talões digitalizados e alertas',
    activateHint: 'Activa para nunca perderes uma garantia',
  },
  subscriptions: {
    id: 'subscriptions',
    emoji: '📱',
    label: 'Subscrições',
    description: 'Custos recorrentes e renovações',
    activateHint: 'Activa para controlar subscrições',
  },
  credits: {
    id: 'credits',
    emoji: '🏦',
    label: 'Créditos',
    description: 'Prestações e custos fixos',
    activateHint: 'Activa para ter visibilidade sobre dívidas',
  },
};

export const ALL_FEATURE_AREAS: FeatureAreaId[] = [
  'spending',
  'goals',
  'wealth',
  'receipts',
  'subscriptions',
  'credits',
];

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
    title: 'Digitalizar primeiro talão',
    subtitle: 'O OCR preenche o movimento automaticamente',
  },
  first_movement: {
    id: 'first_movement',
    emoji: '💳',
    title: 'Adicionar primeira despesa',
    subtitle: 'Começa a ver para onde vai o teu dinheiro',
  },
  first_asset: {
    id: 'first_asset',
    emoji: '🏠',
    title: 'Adicionar primeiro ativo',
    subtitle: 'Regista algo que possuis ou valorizas',
  },
  first_goal: {
    id: 'first_goal',
    emoji: '🎯',
    title: 'Criar primeiro objetivo',
    subtitle: 'Define uma meta de poupança concreta',
  },
  first_warranty: {
    id: 'first_warranty',
    emoji: '🛡️',
    title: 'Registar primeira garantia',
    subtitle: 'Guarda uma garantia para não a perder',
  },
  first_subscription: {
    id: 'first_subscription',
    emoji: '📱',
    title: 'Adicionar primeira subscrição',
    subtitle: 'Acompanha custos e renovações',
  },
};

export const STEP_PROGRESS: Record<string, number> = {
  welcome: 10,
  primary_objective: 22,
  profile: 36,
  name: 48,
  life_areas: 60,
  ambition: 72,
  smart_config: 84,
  reveal: 94,
  wow: 99,
};
