/**
 * Constantes do onboarding premium — opções de cada passo.
 *
 * Cada opção mapeia para os ids de domínio já existentes (ProfileTagId,
 * PrimaryObjectiveId, etc.) para reaproveitar a personalização, o gate e o
 * assistente sem duplicar lógica.
 */
import type {
  AmbitionId,
  FinancialHistoryId,
  OnboardingCreditId,
  OnboardingInvestmentId,
  PrimaryObjectiveId,
  ProfileTagId,
} from './types';

export type PremiumOption<T extends string> = {
  id: T;
  emoji: string;
  label: string;
  description?: string;
};

/** Passo 3 — "O que acontece contigo?" (múltipla). */
export const PROBLEM_OPTIONS: PremiumOption<ProfileTagId>[] = [
  { id: 'control_spending', emoji: '💸', label: 'Não sei para onde vai o dinheiro' },
  { id: 'still_exploring', emoji: '📋', label: 'Tenho demasiadas contas' },
  { id: 'credits_costs', emoji: '💳', label: 'Tenho créditos' },
  { id: 'financial_goals', emoji: '🐷', label: 'Quero poupar' },
  { id: 'track_wealth', emoji: '📈', label: 'Quero investir' },
  { id: 'receipts_warranties', emoji: '🗂️', label: 'Quero simplesmente organização' },
];

/** Passo 4 — "Qual é o teu maior objetivo?" (único). */
export type ObjectiveOption = PremiumOption<string> & {
  primary: PrimaryObjectiveId;
  ambition: AmbitionId;
};

export const OBJECTIVE_OPTIONS: ObjectiveOption[] = [
  { id: 'save', emoji: '🐖', label: 'Poupar', primary: 'save_more', ambition: 'more_savings' },
  {
    id: 'debt',
    emoji: '📉',
    label: 'Eliminar dívidas',
    primary: 'organize_credits',
    ambition: 'reduce_debt',
  },
  {
    id: 'control',
    emoji: '💳',
    label: 'Controlar despesas',
    primary: 'control_spending',
    ambition: 'more_control',
  },
  {
    id: 'wealth',
    emoji: '🏛️',
    label: 'Construir património',
    primary: 'track_wealth',
    ambition: 'invest_more',
  },
  {
    id: 'invest',
    emoji: '📈',
    label: 'Investir',
    primary: 'track_wealth',
    ambition: 'invest_more',
  },
  {
    id: 'peace',
    emoji: '🧘',
    label: 'Ter paz financeira',
    primary: 'control_spending',
    ambition: 'more_control',
  },
];

/** Passo 5 — Histórico. */
export const HISTORY_OPTIONS: PremiumOption<FinancialHistoryId>[] = [
  { id: 'never', emoji: '✨', label: 'Nunca' },
  { id: 'excel', emoji: '📊', label: 'Excel' },
  { id: 'bank', emoji: '🏦', label: 'App do banco' },
  { id: 'other_app', emoji: '📱', label: 'Outra app' },
  { id: 'paper', emoji: '📒', label: 'Papel' },
];

/** Passo 12 — Créditos (múltipla, opcional). */
export const ONBOARDING_CREDIT_OPTIONS: PremiumOption<OnboardingCreditId>[] = [
  { id: 'mortgage', emoji: '🏠', label: 'Habitação' },
  { id: 'auto', emoji: '🚗', label: 'Automóvel' },
  { id: 'personal', emoji: '👤', label: 'Pessoal' },
  { id: 'card', emoji: '💳', label: 'Cartão de crédito' },
];

/** Passo 13 — Investimentos (múltipla). */
export const ONBOARDING_INVESTMENT_OPTIONS: PremiumOption<OnboardingInvestmentId>[] = [
  { id: 'stocks', emoji: '📈', label: 'Ações' },
  { id: 'etf', emoji: '🧺', label: 'ETF' },
  { id: 'crypto', emoji: '🪙', label: 'Crypto' },
  { id: 'ppr', emoji: '🛡️', label: 'PPR' },
  { id: 'funds', emoji: '🏦', label: 'Fundos' },
  { id: 'real_estate', emoji: '🏘️', label: 'Imóveis' },
  { id: 'none', emoji: '➖', label: 'Nenhum' },
];

/** Passo 14 — Segurança (informativo). */
export const SECURITY_ITEMS: { emoji: string; title: string; description: string }[] = [
  { emoji: '🔒', title: 'Face ID e biometria', description: 'Só tu abres a tua CentFlow.' },
  {
    emoji: '🛡️',
    title: 'Encriptação',
    description: 'Os teus dados são protegidos em trânsito e em repouso.',
  },
  {
    emoji: '☁️',
    title: 'Backup e sincronização',
    description: 'O teu plano é sincronizado com segurança com a tua conta.',
  },
];

/** Passo 15 — Construção (passos reais sempre que possível). */
export const BUILD_STEPS: { id: string; label: string }[] = [
  { id: 'ai', label: 'Configurar IA' },
  { id: 'categories', label: 'Criar categorias' },
  { id: 'analytics', label: 'Preparar análises' },
  { id: 'ocr', label: 'Ativar OCR' },
  { id: 'goals', label: 'Criar objetivos' },
  { id: 'sync', label: 'Preparar sincronização' },
];

/** Passo 16 — Resultado (cartões de valor). */
export const RESULT_CARDS: { emoji: string; label: string }[] = [
  { emoji: '📊', label: 'Vais acompanhar o teu património líquido' },
  { emoji: '🏦', label: 'Vais controlar os teus créditos' },
  { emoji: '🔔', label: 'Vais receber alertas no momento certo' },
  { emoji: '🎯', label: 'Vais acompanhar os teus objetivos' },
  { emoji: '💸', label: 'Vais saber quanto podes gastar' },
  { emoji: '🧾', label: 'Vais digitalizar talões em segundos' },
  { emoji: '🤖', label: 'Vais receber análises inteligentes' },
];
