import { logAppEvent } from '@/lib/diagnostics/app-log';

export type SimulationTraceContext = {
  scenarioType: string;
  durationMs: number;
  warningsCount: number;
  screen?: string;
};

/** Doctor — simulação criada (sem valores sensíveis). */
export function traceSimulationCreated(context: SimulationTraceContext): void {
  try {
    logAppEvent('info', 'financial_simulation', 'financial_simulation_created', {
      scenario_type: context.scenarioType,
      duration_ms: context.durationMs,
      warnings_count: context.warningsCount,
      screen: context.screen ?? 'simulator',
    });
  } catch {
    // tracing must never crash flows
  }
}
