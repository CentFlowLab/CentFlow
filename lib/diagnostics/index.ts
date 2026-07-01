export {
  clearAppLog,
  exportAppLogText,
  getAppLogEntries,
  installGlobalDiagnostics,
  logAppError,
  logAppEvent,
  subscribeAppLog,
  type AppLogEntry,
  type AppLogLevel,
  type AppLogSeverity,
} from './app-log';

export {
  getDiagnosticRuntimeContext,
  setDiagnosticAction,
  setDiagnosticScreen,
  withDiagnosticContext,
} from './runtime-context';

export { isDiagnosticsEnabled } from './config';

export * from './doctor-types';
export { groupAppLogEntries, filterOperations } from './doctor-grouping';
export { humanizeStep, humanizeError, resolveOperationTitle } from './doctor-humanize';
export {
  buildDoctorViewModel,
  computeDoctorSummary,
  computePerformanceMetrics,
  getDoctorEnvironmentContext,
  runDoctorHealthChecks,
} from './doctor-metrics';
export { exportDoctorJson, exportDoctorText } from './doctor-export';