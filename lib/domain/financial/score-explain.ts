import type { CentFlowScoreBreakdown, CentFlowScoreResult } from './types';

export type ScoreDimensionKey = keyof CentFlowScoreBreakdown;

export type ScoreDimensionMeta = {
  key: ScoreDimensionKey;
  label: string;
  maxPoints: number;
  earnedLabel: string;
  improveLabel: string;
};

export const SCORE_DIMENSIONS: ScoreDimensionMeta[] = [
  {
    key: 'savings',
    label: 'Poupança mensal',
    maxPoints: 25,
    earnedLabel: 'Boa taxa de poupança face ao rendimento',
    improveLabel: 'Regista rendimentos e controla despesas para poupar mais',
  },
  {
    key: 'debt',
    label: 'Gestão de dívida',
    maxPoints: 25,
    earnedLabel: 'Dívida sob controlo',
    improveLabel: 'Regista créditos para acompanhar o esforço financeiro',
  },
  {
    key: 'subscriptions',
    label: 'Despesas recorrentes',
    maxPoints: 20,
    earnedLabel: 'Despesas recorrentes organizadas no orçamento',
    improveLabel: 'Adiciona despesas recorrentes e revê custos fixos',
  },
  {
    key: 'goals',
    label: 'Objetivos',
    maxPoints: 20,
    earnedLabel: 'Objetivos definidos com progresso',
    improveLabel: 'Cria uma meta de poupança e acompanha o progresso',
  },
  {
    key: 'stability',
    label: 'Estabilidade',
    maxPoints: 10,
    earnedLabel: 'Património estável ou em crescimento',
    improveLabel: 'Regista património e movimentos para afinar a leitura',
  },
];

export type ScoreExplanationLine = {
  key: ScoreDimensionKey;
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
};

const EARNED_THRESHOLD_RATIO = 0.55;

export function buildScoreExplanation(result: CentFlowScoreResult): {
  earned: ScoreExplanationLine[];
  missing: ScoreExplanationLine[];
} {
  const earned: ScoreExplanationLine[] = [];
  const missing: ScoreExplanationLine[] = [];

  for (const dimension of SCORE_DIMENSIONS) {
    const points = result.breakdown[dimension.key];
    const line: ScoreExplanationLine = {
      key: dimension.key,
      label: dimension.label,
      points,
      maxPoints: dimension.maxPoints,
      detail: points >= dimension.maxPoints * EARNED_THRESHOLD_RATIO
        ? dimension.earnedLabel
        : dimension.improveLabel,
    };

    if (points >= dimension.maxPoints * EARNED_THRESHOLD_RATIO) {
      earned.push(line);
    } else {
      missing.push(line);
    }
  }

  earned.sort((a, b) => b.points - a.points);
  missing.sort((a, b) => a.points - b.points);

  return { earned, missing };
}
