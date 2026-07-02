import type { SimulationScenario } from '@/lib/domain/financial/simulator.types';

export type SimulatorOpenRequest = {
  scenario?: SimulationScenario;
  presetType?: SimulationScenario['type'];
};

type SimulatorListener = (request: SimulatorOpenRequest) => void;

let listener: SimulatorListener | null = null;

export function subscribeDecisionSimulator(next: SimulatorListener): () => void {
  listener = next;
  return () => {
    if (listener === next) listener = null;
  };
}

export function openDecisionSimulator(request: SimulatorOpenRequest = {}): void {
  listener?.(request);
}

export function suggestionIdToSimulatorRequest(
  suggestionId: string,
): SimulatorOpenRequest | null {
  if (suggestionId.startsWith('fin-amort-') || suggestionId.startsWith('fin-high-taeg-')) {
    return { presetType: 'amortize_credit' };
  }
  if (suggestionId === 'fin-negative-budget') {
    return { presetType: 'reduce_category_spending' };
  }
  return null;
}
