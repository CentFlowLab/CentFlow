import {
  AMBITION_OPTIONS,
  FEATURE_AREA_CONFIG,
  PRIMARY_OBJECTIVE_OPTIONS,
  PROFILE_OPTIONS,
  WOW_ACTION_CONFIG,
  type WowCardConfig,
} from './constants';
import { computeEnabledFeatures } from './features';
import type {
  AmbitionId,
  FeatureAreaId,
  OnboardingAnswers,
  PrimaryObjectiveId,
  ProfileTagId,
  WowActionId,
} from './types';

const PROFILE_LABELS = Object.fromEntries(
  PROFILE_OPTIONS.map((o) => [o.id, o.label]),
) as Record<ProfileTagId, string>;

const AMBITION_LABELS = Object.fromEntries(
  AMBITION_OPTIONS.map((o) => [o.id, o.label]),
) as Record<AmbitionId, string>;

export function getOnboardingInsights(answers: OnboardingAnswers): string[] {
  const insights: string[] = [];

  for (const tag of answers.profileTags) {
    if (tag === 'still_exploring') continue;
    insights.push(PROFILE_LABELS[tag]);
  }

  for (const ambition of answers.ambitions) {
    if (ambition === 'other') {
      if (answers.ambitionOther.trim()) {
        insights.push(answers.ambitionOther.trim());
      }
      continue;
    }
    insights.push(AMBITION_LABELS[ambition]);
  }

  if (answers.hasSavings === true) {
    insights.push('Tem poupanças para acompanhar');
  }

  if (answers.hasDebt === true) {
    insights.push('Quer ter visibilidade sobre créditos e dívidas');
  }

  if (answers.lifeAreas.includes('keeps_receipts')) {
    insights.push('Guarda faturas e talões regularmente');
  }

  return [...new Set(insights)].slice(0, 6);
}

const PRIMARY_OBJECTIVE_BY_ID = Object.fromEntries(
  PRIMARY_OBJECTIVE_OPTIONS.map((o) => [o.id, o]),
) as Record<PrimaryObjectiveId, (typeof PRIMARY_OBJECTIVE_OPTIONS)[number]>;

export type PrimaryObjectiveSummary = {
  emoji: string;
  label: string;
  description: string;
};

/** Resumo do objetivo principal (para o ecrã "o teu espaço está pronto"). */
export function getPrimaryObjectiveSummary(
  answers: OnboardingAnswers,
): PrimaryObjectiveSummary | null {
  if (!answers.primaryObjective) return null;
  const option = PRIMARY_OBJECTIVE_BY_ID[answers.primaryObjective];
  if (!option) return null;
  return {
    emoji: option.emoji,
    label: option.label,
    description: option.description ?? '',
  };
}

export type OnboardingValueEstimate = {
  emoji: string;
  headline: string;
  detail: string;
};

/**
 * Estimativa de valor mostrada antes de terminar — cria a sensação de
 * "valeu a pena responder". Linguagem propositadamente suave (estimativa,
 * médias) para não prometer números garantidos.
 */
export function getOnboardingValueEstimate(
  answers: OnboardingAnswers,
): OnboardingValueEstimate {
  const objective = answers.primaryObjective;
  const ambitions = new Set(answers.ambitions);

  if (
    objective === 'organize_credits' ||
    answers.hasDebt === true ||
    ambitions.has('reduce_debt')
  ) {
    return {
      emoji: '🏦',
      headline: 'A tua maior oportunidade está nos créditos',
      detail:
        'Organizar prestações e custos fixos costuma libertar dezenas de euros por mês.',
    };
  }

  if (
    objective === 'save_more' ||
    ambitions.has('more_savings') ||
    answers.hasSavings === true
  ) {
    return {
      emoji: '💰',
      headline: 'Acreditamos que consegues poupar mais todos os meses',
      detail:
        'Com metas claras, muitas pessoas poupam 10–15% do que gastam — quase sem esforço.',
    };
  }

  if (objective === 'control_spending') {
    return {
      emoji: '💳',
      headline: 'Vais recuperar o controlo dos teus gastos',
      detail: 'Quem acompanha os gastos reduz, em média, ~15% logo no primeiro mês.',
    };
  }

  if (objective === 'subscriptions') {
    return {
      emoji: '📱',
      headline: 'Há custos recorrentes à espera de serem cortados',
      detail: 'As subscrições esquecidas pesam, em média, 20–40€ por mês.',
    };
  }

  if (objective === 'receipts_warranties') {
    return {
      emoji: '🧾',
      headline: 'Vais deixar de perder dinheiro em garantias',
      detail:
        'Talões digitalizados = devoluções e garantias que normalmente se perdem.',
    };
  }

  if (objective === 'track_wealth') {
    return {
      emoji: '📈',
      headline: 'Vais ver o teu património com clareza total',
      detail:
        'Juntar contas, bens e objetivos revela oportunidades que passam despercebidas.',
    };
  }

  return {
    emoji: '✨',
    headline: 'Preparámos um plano à tua medida',
    detail: 'Quanto mais usares a CentFlow, mais afinadas ficam as recomendações.',
  };
}

export type PriorityFeature = {
  emoji: string;
  label: string;
};

export function getPriorityFeatures(answers: OnboardingAnswers): PriorityFeature[] {
  const enabled = computeEnabledFeatures(answers);
  const features: PriorityFeature[] = enabled.slice(0, 4).map((id) => {
    const config = FEATURE_AREA_CONFIG[id];
    return { emoji: config.emoji, label: config.label };
  });

  if (features.length > 0) return features;

  const tags = new Set(answers.profileTags);
  const areas = new Set(answers.lifeAreas);

  if (
    tags.has('receipts_warranties') ||
    areas.has('keeps_receipts') ||
    areas.has('online_shopping')
  ) {
    features.push({ emoji: '🧾', label: 'Talões e garantias' });
  }

  if (tags.has('track_wealth') || areas.has('investments')) {
    features.push({ emoji: '📈', label: 'Património' });
  }

  if (tags.has('financial_goals') || areas.has('savings_goals')) {
    features.push({ emoji: '🎯', label: 'Objetivos' });
  }

  if (tags.has('control_spending')) {
    features.push({ emoji: '💳', label: 'Controlo de gastos' });
  }

  if (tags.has('credits_costs') || areas.has('credits') || answers.hasDebt) {
    features.push({ emoji: '🏦', label: 'Créditos e custos' });
  }

  if (areas.has('subscriptions')) {
    features.push({ emoji: '📱', label: 'Despesas recorrentes' });
  }

  if (features.length === 0) {
    features.push(
      { emoji: '💳', label: 'Movimentos' },
      { emoji: '📊', label: 'Análises' },
    );
  }

  return features.slice(0, 4);
}

export function getVictoryActionCards(answers: OnboardingAnswers): WowCardConfig[] {
  return getWowActionCards(answers);
}

export function getWowActionCards(answers: OnboardingAnswers): WowCardConfig[] {
  const scores: Record<WowActionId, number> = {
    first_receipt: 0,
    first_movement: 0,
    first_asset: 0,
    first_goal: 0,
    first_warranty: 0,
    first_subscription: 0,
  };

  const tags = answers.profileTags;
  const areas = answers.lifeAreas;
  const objective = answers.primaryObjective;

  if (objective === 'control_spending') {
    scores.first_movement += 5;
    scores.first_receipt += 2;
  }
  if (objective === 'save_more') scores.first_goal += 5;
  if (objective === 'track_wealth') scores.first_asset += 5;
  if (objective === 'receipts_warranties') {
    scores.first_receipt += 5;
    scores.first_warranty += 3;
  }
  if (objective === 'subscriptions') scores.first_subscription += 5;
  if (objective === 'organize_credits') scores.first_movement += 3;

  if (tags.includes('receipts_warranties') || areas.includes('keeps_receipts')) {
    scores.first_receipt += 3;
    scores.first_warranty += 2;
  }

  if (tags.includes('control_spending')) {
    scores.first_movement += 3;
    scores.first_receipt += 1;
  }

  if (tags.includes('track_wealth') || areas.includes('investments')) {
    scores.first_asset += 3;
  }

  if (
    tags.includes('financial_goals') ||
    areas.includes('savings_goals') ||
    answers.ambitions.includes('more_savings')
  ) {
    scores.first_goal += 3;
  }

  if (areas.includes('subscriptions')) {
    scores.first_subscription += 3;
  }

  if (areas.includes('own_home') || areas.includes('car')) {
    scores.first_asset += 2;
    scores.first_warranty += 1;
  }

  if (tags.includes('credits_costs') || areas.includes('credits')) {
    scores.first_movement += 1;
  }

  scores.first_receipt += 1;

  const ranked = (Object.keys(scores) as WowActionId[])
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, 4)
    .map((id) => WOW_ACTION_CONFIG[id]);

  return ranked.length > 0
    ? ranked
    : [WOW_ACTION_CONFIG.first_movement, WOW_ACTION_CONFIG.first_goal];
}

export function getHomeContextualMessage(answers: OnboardingAnswers | null): string | null {
  if (!answers?.completed) return null;

  const tags = new Set(answers.profileTags);
  const areas = new Set(answers.lifeAreas);
  const ambitions = new Set(answers.ambitions);

  // Highest priority: debt / credits focus
  if (
    answers.hasDebt ||
    tags.has('credits_costs') ||
    areas.has('credits') ||
    ambitions.has('reduce_debt')
  ) {
    return 'Mantém os teus créditos e custos sob controlo.';
  }

  // Strong savings / goals signal
  if (
    ambitions.has('more_savings') ||
    tags.has('financial_goals') ||
    areas.has('savings_goals')
  ) {
    return 'Cada movimento conta para os teus objetivos.';
  }

  // Receipts & warranties as primary interest (very actionable)
  if (
    tags.has('receipts_warranties') ||
    areas.has('keeps_receipts') ||
    answers.firstAction === 'first_warranty' ||
    answers.firstAction === 'first_receipt'
  ) {
    return 'Digitaliza talões para não perderes garantias.';
  }

  // Wealth tracking
  if (tags.has('track_wealth') || areas.has('investments')) {
    return 'Acompanha a evolução do teu património todos os dias.';
  }

  // Spending control
  if (tags.has('control_spending') || ambitions.has('more_control')) {
    return 'Hoje é um bom dia para manter os gastos sob controlo.';
  }

  if (answers.spendAwareness === 'no') {
    return 'Vamos descobrir juntos quanto podes gastar este mês.';
  }

  if (answers.spendAwareness === 'yes') {
    return 'Mantém o controlo — a CentFlow afina o teu plano com os teus dados.';
  }

  // Generic ambition based
  if (ambitions.has('more_savings')) {
    return 'Cada pequeno passo conta para as tuas poupanças.';
  }

  if (answers.skipped) {
    return 'Bem-vindo à CentFlow — organiza o teu dinheiro com calma.';
  }

  return 'A tua experiência foi personalizada — vamos começar.';
}

/**
 * Returns a short, actionable subtitle for the Home "personalized for you" area.
 */
export function getPersonalizedHomeSubtitle(answers: OnboardingAnswers | null): string | null {
  if (!answers?.completed) return null;

  const tags = answers.profileTags;
  const areas = answers.lifeAreas;

  if (answers.hasDebt || tags.includes('credits_costs')) {
    return 'Foco em visibilidade sobre dívidas e custos fixos.';
  }
  if (tags.includes('financial_goals') || areas.includes('savings_goals')) {
    return 'Os teus objetivos de poupança guiam as sugestões.';
  }
  if (tags.includes('receipts_warranties') || areas.includes('keeps_receipts')) {
    return 'Talões digitalizados = garantias + histórico automático.';
  }
  if (tags.includes('track_wealth')) {
    return 'Património líquido atualizado em tempo real.';
  }
  return null;
}

export function shouldShowDebtFeatures(answers: OnboardingAnswers): boolean {
  return (
    answers.hasDebt === true ||
    answers.profileTags.includes('credits_costs') ||
    answers.lifeAreas.includes('credits')
  );
}

export function shouldShowSavingsFeatures(answers: OnboardingAnswers): boolean {
  return (
    answers.hasSavings === true ||
    answers.profileTags.includes('financial_goals') ||
    answers.lifeAreas.includes('savings_goals')
  );
}

/* ============================================================
 * EMPTY STATE PERSONALIZATION (for Ativos tab + Home)
 * ============================================================ */

export type AssetsTabKey = 'objetivos' | 'garantias' | 'inventario';

export function getPersonalizedCreditsEmptyCopy(
  answers: OnboardingAnswers | null,
  variant: 'loan' | 'card' = 'loan',
): { title: string; description: string; actionLabel?: string } {
  if (!answers?.completed) {
    return { title: '', description: '' };
  }

  const hasCredits =
    answers.creditTypes.length > 0 ||
    answers.hasDebt ||
    answers.profileTags.includes('credits_costs') ||
    answers.primaryObjective === 'organize_credits';

  if (!hasCredits) {
    return { title: '', description: '' };
  }

  if (variant === 'card') {
    return {
      title: 'Regista o teu primeiro cartão',
      description:
        'Indicaste que tens cartões de crédito — começa por registar limites e saldos para acompanhar a utilização.',
      actionLabel: 'Novo cartão',
    };
  }

  const labels: Record<string, string> = {
    mortgage: 'habitação',
    auto: 'automóvel',
    personal: 'pessoal',
    card: 'cartão',
  };
  const types = answers.creditTypes.map((id) => labels[id] ?? id).join(', ');

  return {
    title: 'Mapeia os teus créditos',
    description: `Referiste créditos (${types}) — regista prestações e datas para teres visibilidade sobre o que sai todos os meses.`,
    actionLabel: 'Novo crédito',
  };
}

export function getPersonalizedEmptyStateCopy(
  tab: AssetsTabKey,
  answers: OnboardingAnswers | null,
): { title: string; description: string; actionLabel?: string } {
  if (!answers?.completed) {
    // Fallback to generic (caller can use ASSETS_EMPTY_CONFIG)
    return { title: '', description: '' };
  }

  const tags = new Set(answers.profileTags);
  const areas = new Set(answers.lifeAreas);
  const first = answers.firstAction;

  if (tab === 'garantias') {
    if (
      tags.has('receipts_warranties') ||
      areas.has('keeps_receipts') ||
      first === 'first_warranty' ||
      first === 'first_receipt'
    ) {
      return {
        title: 'Ainda não tens garantias',
        description:
          'Digitaliza o teu primeiro talão para começares a guardar garantias automaticamente. Nunca mais percas uma.',
        actionLabel: 'Digitalizar talão',
      };
    }
    return {
      title: 'Protege as tuas compras',
      description:
        'Regista garantias com data de expiração. Associa ao talão e recebe alertas antes de expirarem.',
    };
  }

  if (tab === 'objetivos') {
    if (
      tags.has('financial_goals') ||
      areas.has('savings_goals') ||
      answers.ambitions.some((a) => ['more_savings', 'buy_home', 'buy_car', 'travel'].includes(a))
    ) {
      return {
        title: 'Define o teu primeiro objetivo',
        description:
          'Tens objetivos de poupança — começa por criar uma meta concreta (fundo de emergência, viagem, etc.) e acompanha o progresso.',
        actionLabel: 'Criar primeiro objetivo',
      };
    }
    return {
      title: 'Ainda sem objetivos',
      description:
        'Cria metas de poupança com valor alvo, data prevista e acompanha o progresso em tempo real.',
    };
  }

  // inventario
  if (tags.has('track_wealth') || areas.has('investments') || areas.has('own_home') || areas.has('car')) {
    return {
      title: 'Regista os teus bens',
      description:
        'Mantém o valor dos teus ativos físicos (electrónica, casa, carro...) para teres uma visão completa do património.',
      actionLabel: 'Adicionar primeiro item',
    };
  }

  return {
    title: 'Inventaria os teus bens',
    description:
      'Mantém registo do valor dos teus ativos físicos — eletrónica, joias, equipamento.',
  };
}

/** Used by Home screen "sem movimentos" empty block and movimentos tab */
export function getContextualNoTransactionsMessage(
  answers: OnboardingAnswers | null,
  filter: 'all' | 'expense' | 'income' = 'all',
): string {
  if (filter !== 'all') {
    if (filter === 'expense') return 'Não tens despesas registadas neste filtro.';
    return 'Não tens receitas registadas neste filtro.';
  }

  if (!answers?.completed) {
    return 'Adiciona a primeira transação ou digitaliza um talão para começares a ter histórico completo.';
  }

  const tags = new Set(answers.profileTags);
  const areas = new Set(answers.lifeAreas);

  if (tags.has('receipts_warranties') || areas.has('keeps_receipts') || answers.firstAction === 'first_receipt') {
    return 'Digitaliza o teu primeiro talão e vê como o OCR preenche automaticamente os movimentos.';
  }

  if (tags.has('control_spending')) {
    return 'Regista a tua primeira despesa para começares a controlar os gastos.';
  }

  return 'Adiciona a primeira transação ou digitaliza um talão para começares a ter histórico completo.';
}

/* ============================================================
 * QUICK ACTIONS / HOME RECOMMENDATIONS
 * ============================================================ */

export type RecommendedAction = {
  key: 'receipt' | 'goal' | 'warranty' | 'asset' | 'movement';
  label: string;
  description?: string;
};

export function getRecommendedHomeActions(answers: OnboardingAnswers | null): RecommendedAction[] {
  if (!answers?.completed) {
    return [
      { key: 'receipt', label: 'Digitalizar talão' },
      { key: 'movement', label: 'Adicionar movimento' },
    ];
  }

  const tags = new Set(answers.profileTags);
  const areas = new Set(answers.lifeAreas);
  const ambitions = new Set(answers.ambitions);
  const first = answers.firstAction;

  const recs: RecommendedAction[] = [];

  // Receipts / warranties first if that was their interest
  if (
    tags.has('receipts_warranties') ||
    areas.has('keeps_receipts') ||
    first === 'first_receipt' ||
    first === 'first_warranty'
  ) {
    recs.push({ key: 'receipt', label: 'Digitalizar talão' });
    if (first === 'first_warranty' || tags.has('receipts_warranties')) {
      recs.push({ key: 'warranty', label: 'Registar garantia' });
    }
  }

  // Goals high priority
  if (
    tags.has('financial_goals') ||
    areas.has('savings_goals') ||
    ambitions.has('more_savings') ||
    first === 'first_goal'
  ) {
    recs.push({ key: 'goal', label: 'Criar objetivo' });
  }

  // Debt / credits visibility
  if (tags.has('credits_costs') || areas.has('credits') || answers.hasDebt) {
    recs.push({ key: 'movement', label: 'Registar pagamento de crédito' });
  }

  // Wealth / inventory
  if (tags.has('track_wealth') || areas.has('investments') || first === 'first_asset') {
    recs.push({ key: 'asset', label: 'Adicionar bem ao inventário' });
  }

  // Always have a safe default for adding movement / receipt
  if (recs.length === 0) {
    recs.push({ key: 'receipt', label: 'Digitalizar talão' });
  }

  // Ensure we don't duplicate and cap at 2 strong recommendations
  const seen = new Set<string>();
  const unique = recs.filter((r) => {
    if (seen.has(r.key)) return false;
    seen.add(r.key);
    return true;
  });

  return unique.slice(0, 2);
}

/* ============================================================
 * HOME INSIGHTS & CONTEXTUAL UI
 * ============================================================ */

export type HomeInsightContext = {
  goalsCount: number;
  warrantiesCount: number;
  hasFeaturedGoal: boolean;
};

export type HomePersonalizedInsight = {
  emoji: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaRoute?: string;
};

export function getHomePersonalizedInsight(
  answers: OnboardingAnswers | null,
  context: HomeInsightContext,
): HomePersonalizedInsight | null {
  if (!answers?.completed) return null;

  const tags = new Set(answers.profileTags);
  const areas = new Set(answers.lifeAreas);
  const ambitions = new Set(answers.ambitions);

  if (shouldShowDebtFeatures(answers)) {
    return {
      emoji: '🏦',
      title: 'Créditos e custos fixos',
      message:
        'Regista pagamentos de crédito e subscrições para teres visibilidade real sobre o que sai todos os meses.',
      ctaLabel: 'Registar movimento',
      ctaRoute: '/(tabs)/movimentos?action=new-movement',
    };
  }

  if (
    (tags.has('financial_goals') ||
      areas.has('savings_goals') ||
      ambitions.has('more_savings')) &&
    context.goalsCount === 0
  ) {
    return {
      emoji: '🎯',
      title: 'O teu primeiro objetivo',
      message:
        'Definiste que queres poupar com intenção — cria uma meta concreta e acompanha o progresso aqui no Início.',
      ctaLabel: 'Criar objetivo',
      ctaRoute: '/(tabs)/ativos?action=new-goal',
    };
  }

  if (
    (tags.has('receipts_warranties') ||
      areas.has('keeps_receipts') ||
      answers.firstAction === 'first_warranty' ||
      answers.firstAction === 'first_receipt') &&
    context.warrantiesCount === 0
  ) {
    return {
      emoji: '🧾',
      title: 'Garantias sem esforço',
      message:
        'Digitaliza um talão e guarda automaticamente o histórico — a base perfeita para registar garantias.',
      ctaLabel: 'Digitalizar talão',
      ctaRoute: '/(tabs)/movimentos?action=receipt',
    };
  }

  if (tags.has('track_wealth') || areas.has('investments')) {
    return {
      emoji: '📈',
      title: 'Património completo',
      message:
        'Combina movimentos, objetivos e inventário para veres a evolução do teu património num só lugar.',
      ctaLabel: 'Ver ativos',
      ctaRoute: '/(tabs)/ativos',
    };
  }

  if (tags.has('control_spending')) {
    return {
      emoji: '💳',
      title: 'Controlo de gastos',
      message:
        'Regista despesas à medida que acontecem — em poucos dias vais perceber para onde vai o dinheiro.',
      ctaLabel: 'Adicionar despesa',
      ctaRoute: '/(tabs)/movimentos?action=new-movement',
    };
  }

  return null;
}

export type HomeAssetsTileHint = {
  goals?: string;
  warranties?: string;
  inventory?: string;
};

export function getHomeAssetsSummaryHints(
  answers: OnboardingAnswers | null,
): HomeAssetsTileHint {
  if (!answers?.completed) return {};

  const tags = new Set(answers.profileTags);
  const areas = new Set(answers.lifeAreas);
  const hasInvestments = answers.investmentTypes.some((type) => type !== 'none');
  const hasCredits = answers.creditTypes.length > 0 || answers.hasDebt === true;

  const hints: HomeAssetsTileHint = {};

  if (tags.has('financial_goals') || areas.has('savings_goals') || (answers.savingsGoal ?? 0) > 0) {
    hints.goals = 'Foco em poupança';
  }
  if (tags.has('receipts_warranties') || areas.has('keeps_receipts')) {
    hints.warranties = 'Talões → garantias';
  }
  if (tags.has('track_wealth') || areas.has('investments') || hasInvestments) {
    hints.inventory = 'Património físico';
  }
  if (hasCredits && !hints.goals) {
    hints.goals = 'Créditos activos';
  }

  return hints;
}

export type HomeSectionId = 'spendable' | 'assets' | 'alerts' | 'assistant';

/** Ordena secções do Início conforme prioridades declaradas no onboarding. */
export function getHomeSectionOrder(answers: OnboardingAnswers | null): HomeSectionId[] {
  const defaultOrder: HomeSectionId[] = ['spendable', 'assets', 'alerts', 'assistant'];
  if (!answers?.completed) return defaultOrder;

  const tags = new Set(answers.profileTags);
  const hasCredits =
    answers.creditTypes.length > 0 ||
    answers.hasDebt === true ||
    tags.has('credits_costs') ||
    answers.primaryObjective === 'organize_credits';
  const hasInvestments =
    answers.investmentTypes.some((type) => type !== 'none') || tags.has('track_wealth');
  const needsSpendingHelp = answers.spendAwareness === 'no' || tags.has('control_spending');
  const hasSavingsFocus =
    answers.primaryObjective === 'save_more' ||
    tags.has('financial_goals') ||
    (answers.savingsGoal ?? 0) > 0;

  if (hasCredits) {
    return ['spendable', 'alerts', 'assets', 'assistant'];
  }
  if (hasInvestments) {
    return ['spendable', 'assets', 'alerts', 'assistant'];
  }
  if (needsSpendingHelp) {
    return ['spendable', 'assistant', 'alerts', 'assets'];
  }
  if (hasSavingsFocus) {
    return ['spendable', 'assets', 'assistant', 'alerts'];
  }

  return defaultOrder;
}

export type FallbackSuggestion = {
  id: string;
  title: string;
  description: string;
  type: 'goal' | 'savings' | 'investment' | 'general';
  actionLabel?: string;
  ctaRoute?: string;
};

export function getPersonalizedFallbackSuggestions(
  answers: OnboardingAnswers | null,
): FallbackSuggestion[] {
  if (!answers?.completed) {
    return [
      {
        id: 'fallback-receipt',
        title: 'Digitaliza o primeiro talão',
        description: 'O OCR preenche o movimento e guarda o histórico para garantias.',
        type: 'general',
        actionLabel: 'Experimentar',
        ctaRoute: '/(tabs)/movimentos?action=receipt',
      },
    ];
  }

  const tags = new Set(answers.profileTags);
  const areas = new Set(answers.lifeAreas);
  const ambitions = new Set(answers.ambitions);
  const suggestions: FallbackSuggestion[] = [];

  if (tags.has('receipts_warranties') || areas.has('keeps_receipts')) {
    suggestions.push({
      id: 'onboarding-receipt',
      title: 'Começa por um talão',
      description:
        'É a forma mais rápida de criar movimentos e preparar garantias sem papelada.',
      type: 'general',
      actionLabel: 'Digitalizar talão',
      ctaRoute: '/(tabs)/movimentos?action=receipt',
    });
  }

  if (
    tags.has('financial_goals') ||
    areas.has('savings_goals') ||
    ambitions.has('more_savings')
  ) {
    suggestions.push({
      id: 'onboarding-goal',
      title: 'Define um objetivo concreto',
      description: 'Fundo de emergência, viagem ou entrada de casa — escolhe uma meta e acompanha.',
      type: 'goal',
      actionLabel: 'Criar objetivo',
      ctaRoute: '/(tabs)/ativos?action=new-goal',
    });
  }

  if (shouldShowDebtFeatures(answers)) {
    suggestions.push({
      id: 'onboarding-debt',
      title: 'Mapeia os teus créditos',
      description:
        'Regista prestações e custos fixos para saberes quanto comprometido tens por mês.',
      type: 'savings',
      actionLabel: 'Ver movimentos',
      ctaRoute: '/(tabs)/movimentos?action=new-movement',
    });
  }

  if (tags.has('track_wealth') || areas.has('investments')) {
    suggestions.push({
      id: 'onboarding-wealth',
      title: 'Completa o inventário',
      description: 'Adiciona bens com valor estimado para enriquecer a visão do património.',
      type: 'investment',
      actionLabel: 'Adicionar bem',
      ctaRoute: '/(tabs)/ativos?action=new-asset',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'onboarding-default',
      title: 'Primeiro passo',
      description: 'Adiciona um movimento ou digitaliza um talão para activar as análises.',
      type: 'general',
      actionLabel: 'Começar',
      ctaRoute: '/(tabs)/movimentos?action=new-movement',
    });
  }

  return suggestions.slice(0, 2);
}

export function shouldPrioritizeGoals(answers: OnboardingAnswers | null): boolean {
  if (!answers?.completed) return false;
  return shouldShowSavingsFeatures(answers);
}

export function shouldPrioritizeWarranties(answers: OnboardingAnswers | null): boolean {
  if (!answers?.completed) return false;
  const tags = new Set(answers.profileTags);
  const areas = new Set(answers.lifeAreas);
  return (
    tags.has('receipts_warranties') ||
    areas.has('keeps_receipts') ||
    answers.firstAction === 'first_warranty' ||
    answers.firstAction === 'first_receipt'
  );
}
