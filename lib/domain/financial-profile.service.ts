import type {
  AiFeatureKey,
  FinancialProfileLevel,
  FinancialProfileResult,
  FinancialProfileSignals,
  ProfileDimension,
  ProfileDimensionId,
} from './financial-profile.types';

export const PROFILE_DIMENSION_WEIGHTS = {
  transactions: 20,
  receipts: 20,
  goals: 20,
  assets: 20,
  patrimony: 20,
} as const;

const LEVEL_THRESHOLDS: Record<FinancialProfileLevel, { min: number; max: number }> = {
  1: { min: 0, max: 29 },
  2: { min: 30, max: 59 },
  3: { min: 60, max: 100 },
};

const LEVEL_META: Record<
  FinancialProfileLevel,
  { label: string; title: string; features: string[] }
> = {
  1: {
    label: 'Nível 1',
    title: 'Insights básicos',
    features: ['Resumo de gastos', 'Alertas simples'],
  },
  2: {
    label: 'Nível 2',
    title: 'Métricas avançadas',
    features: ['Inflação pessoal', 'Comparações mensais', 'Alocação de património'],
  },
  3: {
    label: 'Nível 3',
    title: 'Assistente CentFlow',
    features: ['IA personalizada', 'Sugestões proactivas', 'Perguntas em linguagem natural'],
  },
};

const DIMENSION_META: Record<
  ProfileDimensionId,
  Omit<ProfileDimension, 'completed' | 'weight' | 'maxWeight'>
> = {
  transactions: {
    id: 'transactions',
    label: 'Movimentos',
    description: 'Regista transações para ter histórico financeiro',
    actionHint: 'Adiciona o primeiro movimento ou importa um CSV',
  },
  receipts: {
    id: 'receipts',
    label: 'Talões digitalizados',
    description: 'Digitaliza faturas para enriquecer os teus dados',
    actionHint: 'Digitaliza um talão na criação de movimento',
  },
  goals: {
    id: 'goals',
    label: 'Objetivos',
    description: 'Define metas de poupança ou investimento',
    actionHint: 'Cria um objetivo na área Ativos',
  },
  assets: {
    id: 'assets',
    label: 'Garantias ou inventário',
    description: 'Regista bens e garantias para controlo total',
    actionHint: 'Adiciona um item ao inventário ou uma garantia',
  },
  patrimony: {
    id: 'patrimony',
    label: 'Património',
    description: 'Liga contas e investimentos para visão completa',
    actionHint: 'Adiciona contas bancárias ou investimentos',
  },
};

export function getLevelFromScore(score: number): FinancialProfileLevel {
  if (score >= LEVEL_THRESHOLDS[3].min) return 3;
  if (score >= LEVEL_THRESHOLDS[2].min) return 2;
  return 1;
}

export function getPointsToNextLevel(score: number): {
  nextLevel: FinancialProfileLevel | null;
  points: number;
} {
  const level = getLevelFromScore(score);
  if (level === 3) return { nextLevel: null, points: 0 };

  const nextLevel = (level + 1) as FinancialProfileLevel;
  const threshold = LEVEL_THRESHOLDS[nextLevel].min;
  return { nextLevel, points: Math.max(0, threshold - score) };
}

export function buildProfileDimensions(signals: FinancialProfileSignals): ProfileDimension[] {
  const hasTransactions = signals.transactionCount > 0;
  const hasReceipts = signals.receiptCount > 0;
  const hasGoals = signals.goalCount > 0;
  const hasAssets =
    signals.warrantyCount > 0 || signals.inventoryCount > 0;
  const hasPatrimony =
    signals.hasPatrimonyAccounts || signals.hasPatrimonyInvestments;

  const completion: Record<ProfileDimensionId, boolean> = {
    transactions: hasTransactions,
    receipts: hasReceipts,
    goals: hasGoals,
    assets: hasAssets,
    patrimony: hasPatrimony,
  };

  return (Object.keys(PROFILE_DIMENSION_WEIGHTS) as ProfileDimensionId[]).map((id) => {
    const maxWeight = PROFILE_DIMENSION_WEIGHTS[id];
    const completed = completion[id];

    return {
      ...DIMENSION_META[id],
      completed,
      weight: completed ? maxWeight : 0,
      maxWeight,
    };
  });
}

export function calculateFinancialProfile(
  signals: FinancialProfileSignals,
): FinancialProfileResult {
  const dimensions = buildProfileDimensions(signals);
  const rawScore = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  const score = Math.min(100, Math.max(0, rawScore));
  const level = getLevelFromScore(score);
  const { nextLevel, points: pointsToNextLevel } = getPointsToNextLevel(score);
  const pendingDimensions = dimensions.filter((dimension) => !dimension.completed);

  const unlockedFeatures = Object.entries(LEVEL_META)
    .filter(([lvl]) => Number(lvl) <= level)
    .flatMap(([, meta]) => meta.features);

  const lockedFeatures = Object.entries(LEVEL_META)
    .filter(([lvl]) => Number(lvl) > level)
    .flatMap(([, meta]) => meta.features);

  const meta = LEVEL_META[level];

  return {
    score,
    level,
    levelLabel: meta.label,
    levelTitle: meta.title,
    nextLevel,
    pointsToNextLevel,
    dimensions,
    pendingDimensions,
    unlockedFeatures,
    lockedFeatures,
  };
}

export function isAiFeatureUnlocked(
  profile: FinancialProfileResult,
  feature: AiFeatureKey,
): boolean {
  switch (feature) {
    case 'basic_insights':
      return profile.level >= 1;
    case 'advanced_metrics':
      return profile.level >= 2;
    case 'ai_assistant':
      return profile.level >= 3;
    default:
      return false;
  }
}

export function canAccessAiAssistant(profile: FinancialProfileResult): boolean {
  return isAiFeatureUnlocked(profile, 'ai_assistant');
}
