import { logAppEvent } from '@/lib/diagnostics/app-log';

import { DEFAULT_FINANCIAL_ENGINE_STEP_RUNNERS } from './engine.steps';
import type {
  FinancialEngineContext,
  FinancialEngineInput,
  FinancialEngineOptions,
  FinancialEngineRunResult,
  FinancialEngineStepId,
  FinancialEngineStepOutcome,
  FinancialRecalcTrigger,
} from './engine.types';
import { FINANCIAL_ENGINE_STEP_ORDER } from './engine.types';

export { FINANCIAL_ENGINE_STEP_ORDER } from './engine.types';

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function formatStepError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Motor financeiro central — orquestra recálculos derivados sem reimplementar fórmulas.
 * Cada passo corre de forma isolada; falha num passo não bloqueia os restantes.
 */
export async function recalculateFinancialState(
  userId: string,
  input: FinancialEngineInput,
  trigger: FinancialRecalcTrigger,
  options: FinancialEngineOptions = {},
): Promise<FinancialEngineRunResult> {
  const started = nowMs();
  const asOf = input.referenceDate ?? new Date();

  const ctx: FinancialEngineContext = {
    userId,
    input,
    asOf,
    results: {},
  };

  const steps: FinancialEngineStepOutcome[] = [];

  for (const stepId of FINANCIAL_ENGINE_STEP_ORDER as readonly FinancialEngineStepId[]) {
    const runner = options.stepRunners?.[stepId] ?? DEFAULT_FINANCIAL_ENGINE_STEP_RUNNERS[stepId];
    const stepStarted = nowMs();

    try {
      await runner(ctx);
      const outcome: FinancialEngineStepOutcome = {
        step: stepId,
        ok: true,
        durationMs: Math.round(nowMs() - stepStarted),
      };
      steps.push(outcome);
      options.onStepComplete?.(outcome);

      logAppEvent('debug', 'financial-engine', `step_ok:${stepId}`, {
        userId,
        trigger: trigger.type,
        durationMs: outcome.durationMs,
      });
    } catch (error) {
      const outcome: FinancialEngineStepOutcome = {
        step: stepId,
        ok: false,
        durationMs: Math.round(nowMs() - stepStarted),
        error: formatStepError(error),
      };
      steps.push(outcome);
      options.onStepComplete?.(outcome);

      logAppEvent('warn', 'financial-engine', `step_failed:${stepId}`, {
        userId,
        trigger: trigger.type,
        durationMs: outcome.durationMs,
        error: outcome.error,
      });
    }
  }

  const totalDurationMs = Math.round(nowMs() - started);
  const failed = steps.filter((step) => !step.ok).length;

  logAppEvent('info', 'financial-engine', 'recalculation_complete', {
    userId,
    trigger: trigger.type,
    totalDurationMs,
    stepsOk: steps.length - failed,
    stepsFailed: failed,
  });

  return {
    trigger,
    userId,
    totalDurationMs,
    steps,
    results: ctx.results,
  };
}
