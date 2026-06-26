import { logAppError, logAppEvent } from '@/lib/diagnostics';
import { setDiagnosticAction } from '@/lib/diagnostics/runtime-context';

export const MOVEMENT_FLOW_SOURCE = 'movement_create';

export type MovementFlowStep =
  | 'form_open'
  | 'form_init_start'
  | 'form_init_done'
  | 'form_close_request'
  | 'field_change'
  | 'effect_reset_form'
  | 'effect_sync_category'
  | 'effect_auto_receipt_picker'
  | 'effect_retake_receipt'
  | 'render_tick'
  | 'render_loop_suspect'
  | 'sheet_visible'
  | 'sheet_close'
  | 'validation_start'
  | 'validation_fail'
  | 'validation_success'
  | 'save_click'
  | 'mutation_start'
  | 'mutation_phase'
  | 'mutation_service_start'
  | 'mutation_service_upload'
  | 'mutation_service_ocr'
  | 'mutation_service_creating'
  | 'mutation_service_supabase_auth'
  | 'mutation_service_supabase_insert'
  | 'mutation_service_supabase_receipt_url'
  | 'mutation_service_done'
  | 'mutation_success'
  | 'mutation_error'
  | 'mutation_settled'
  | 'cache_invalidate_start'
  | 'cache_invalidate_done'
  | 'modal_close'
  | 'stall_detected';

type TraceMeta = Record<string, unknown>;

let lastStep: MovementFlowStep | string = 'idle';
let lastStepAt = Date.now();
let stallTimer: ReturnType<typeof setTimeout> | null = null;
const fieldChangeThrottle = new Map<string, number>();

const STALL_WARN_MS = 12_000;
const FIELD_CHANGE_THROTTLE_MS = 400;

function clearStallWatch() {
  if (stallTimer) {
    clearTimeout(stallTimer);
    stallTimer = null;
  }
}

function scheduleStallWatch(step: MovementFlowStep | string) {
  clearStallWatch();
  stallTimer = setTimeout(() => {
    const elapsed = Date.now() - lastStepAt;
    logAppEvent('warn', MOVEMENT_FLOW_SOURCE, `STALL após ${step} (${elapsed}ms sem progresso)`, {
      step: 'stall_detected',
      action: 'movement_create',
      screen: 'movement_create',
      lastStep: step,
      stallMs: elapsed,
      severity: 'high',
    });
  }, STALL_WARN_MS);
}

/** Passo estruturado no fluxo de criação de movimentos — sempre visível no Doctor. */
export function traceMovementStep(
  step: MovementFlowStep | string,
  meta?: TraceMeta,
  level: 'info' | 'warn' | 'error' = 'info',
): void {
  if (step === 'field_change' && meta?.field) {
    const key = String(meta.field);
    const now = Date.now();
    const last = fieldChangeThrottle.get(key) ?? 0;
    if (now - last < FIELD_CHANGE_THROTTLE_MS) return;
    fieldChangeThrottle.set(key, now);
  }

  lastStep = step;
  lastStepAt = Date.now();
  setDiagnosticAction(`movement:${step}`);

  const context = {
    step,
    action: 'movement_create',
    screen: 'movement_create',
    component: meta?.component ?? 'AddTransactionModal',
    elapsedSinceLastMs: meta?.elapsedSinceLastMs,
    ...meta,
  };

  if (level === 'error') {
    logAppError(MOVEMENT_FLOW_SOURCE, new Error(String(meta?.message ?? step)), context);
  } else {
    logAppEvent(level, MOVEMENT_FLOW_SOURCE, step, context);
  }

  if (
    step === 'mutation_start' ||
    step === 'mutation_service_start' ||
    step === 'mutation_service_supabase_insert' ||
    step === 'cache_invalidate_start'
  ) {
    scheduleStallWatch(step);
  }

  if (
    step === 'mutation_success' ||
    step === 'mutation_error' ||
    step === 'mutation_settled' ||
    step === 'cache_invalidate_done' ||
    step === 'modal_close' ||
    step === 'validation_fail' ||
    step === 'form_close_request'
  ) {
    clearStallWatch();
  }
}

export function traceMovementError(
  step: MovementFlowStep | string,
  error: unknown,
  meta?: TraceMeta,
): void {
  const message = error instanceof Error ? error.message : String(error);
  logAppError(MOVEMENT_FLOW_SOURCE, error instanceof Error ? error : new Error(message), {
    step,
    action: 'movement_create',
    screen: 'movement_create',
    ...meta,
  });
  clearStallWatch();
}

export function getMovementFlowDebugState(): {
  lastStep: string;
  lastStepAt: number;
  msSinceLastStep: number;
} {
  return {
    lastStep,
    lastStepAt,
    msSinceLastStep: Date.now() - lastStepAt,
  };
}
