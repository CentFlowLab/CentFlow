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

export const DOCTOR_SOURCE = 'centflow-doctor';
