/**
 * CentFlow Doctor — diagnóstico interno (erros, mutations, validação).
 * Em produção mantém-se discreto; em dev/beta expõe painel de logs.
 */
export {
  clearAppLog,
  exportAppLogText,
  getAppLogEntries,
  isDiagnosticsEnabled,
  logAppError,
  logAppEvent,
  subscribeAppLog,
  type AppLogEntry,
  type AppLogLevel,
} from '@/lib/diagnostics';

export {
  logDoctorMutationFailure,
  logDoctorValidationFailure,
  type MutationFailureContext,
} from './log-mutation';

export {
  traceFinancialMutationStep,
  traceFinancialMutationError,
  traceOcrFailure,
  FINANCIAL_MUTATION_SOURCE,
  OCR_FLOW_SOURCE,
  type FinancialMutationAction,
  type FinancialTraceContext,
} from './financial-mutation-trace';

export {
  traceMovementStep,
  traceMovementError,
  getMovementFlowDebugState,
  MOVEMENT_FLOW_SOURCE,
  type MovementFlowStep,
} from './movement-flow-trace';

export const DOCTOR_SOURCE = 'centflow-doctor';
