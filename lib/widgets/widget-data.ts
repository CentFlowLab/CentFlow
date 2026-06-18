import { useHomeScreenData } from '@/hooks/queries/useHomeScreenData';
import { useCentFlowIntelligence } from '@/hooks/useCentFlowIntelligence';
import type { CentFlowScoreResult } from '@/lib/domain/financial';

/** Snapshot para widgets nativos (iOS/Android) — v1.2 */
export type WidgetSnapshot = {
  updatedAt: string;
  netWorth: number;
  centFlowScore: number;
  scoreBand: CentFlowScoreResult['band'];
  weeklySpending: number;
  topInsight: string;
};

export function buildWidgetSnapshot(input: {
  netWorth: number;
  weeklySpending: number;
  score: CentFlowScoreResult;
  topInsight: string;
}): WidgetSnapshot {
  return {
    updatedAt: new Date().toISOString(),
    netWorth: input.netWorth,
    centFlowScore: input.score.score,
    scoreBand: input.score.band,
    weeklySpending: input.weeklySpending,
    topInsight: input.topInsight,
  };
}

export function useWidgetSnapshot(): WidgetSnapshot | null {
  const { data: home } = useHomeScreenData();
  const { score, assistant } = useCentFlowIntelligence();

  if (!home) return null;

  return buildWidgetSnapshot({
    netWorth: home.netWorth.netWorth,
    weeklySpending: home.weeklySpending,
    score,
    topInsight: assistant.insights[0]?.title ?? 'Regista o teu primeiro movimento',
  });
}

/** Persistência nativa de widgets fica para build nativo dedicado. */
export const WIDGET_STORAGE_KEY = 'centflow:widget:snapshot';
