import type { AppLogEntry, AppLogLevel } from './app-log';

export type DoctorTab =
  | 'summary'
  | 'errors'
  | 'performance'
  | 'sync'
  | 'database'
  | 'logs';

export type OperationStatus =
  | 'success'
  | 'warning'
  | 'error'
  | 'cancelled'
  | 'timeout'
  | 'offline'
  | 'running';

export type HealthStatus = 'ok' | 'warning' | 'error' | 'unknown';

export type DoctorCategory =
  | 'movement'
  | 'goal'
  | 'account'
  | 'ocr'
  | 'auth'
  | 'cache'
  | 'supabase'
  | 'performance'
  | 'sync'
  | 'other';

export type DoctorFilter =
  | 'all'
  | 'errors'
  | 'warnings'
  | 'movement'
  | 'goal'
  | 'account'
  | 'ocr'
  | 'performance'
  | 'auth'
  | 'supabase'
  | 'sync';

export type TimelinePhaseStatus = 'success' | 'warning' | 'error' | 'pending' | 'skipped';

export type DiagnosticTimelinePhase = {
  key: string;
  label: string;
  status: TimelinePhaseStatus;
  timestamp: string;
  durationMs?: number;
  steps: string[];
};

export type HumanErrorInfo = {
  title: string;
  message: string;
  possibleCause?: string;
  solution?: string;
  technicalMessage: string;
  stack?: string;
};

export type DiagnosticOperation = {
  id: string;
  title: string;
  status: OperationStatus;
  category: DoctorCategory;
  origin: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  eventCount: number;
  timeline: DiagnosticTimelinePhase[];
  entries: AppLogEntry[];
  humanError?: HumanErrorInfo;
  screen?: string;
  action?: string;
};

export type DoctorSummary = {
  overallStatus: 'healthy' | 'warnings' | 'errors';
  overallLabel: string;
  crashes: number;
  warnings: number;
  errors: number;
  avgOperationMs: number;
  avgOcrMs: number | null;
  pendingQueries: number;
  lastSyncAt: string | null;
  systemHealth: Array<{ key: string; label: string; status: HealthStatus }>;
};

export type PerformanceMetric = {
  label: string;
  durationMs: number;
  category: DoctorCategory;
  status: HealthStatus;
};

export type DoctorHealthSnapshot = {
  checkedAt: string;
  supabase: { status: HealthStatus; latencyMs?: number; message?: string };
  session: { status: HealthStatus; userId?: string; message?: string };
  refreshToken: { status: HealthStatus; message?: string };
  rls: { status: HealthStatus; message?: string };
  migrations: { status: HealthStatus; message?: string };
  storage: { status: HealthStatus; message?: string };
  ota: { status: HealthStatus; channel?: string; updateId?: string; message?: string };
  cache: { status: HealthStatus; pendingQueries: number; message?: string };
};

export type DoctorEnvironmentContext = {
  otaVersion?: string;
  otaChannel?: string;
  buildVersion?: string;
  nativeVersion?: string;
  platform: string;
  osVersion?: string;
  commit?: string;
};

export type DoctorExportPayload = {
  exportedAt: string;
  environment: DoctorEnvironmentContext;
  summary: DoctorSummary;
  health: DoctorHealthSnapshot;
  performance: PerformanceMetric[];
  operations: DiagnosticOperation[];
  rawEntryCount: number;
};

export function levelToHealth(level: AppLogLevel): HealthStatus {
  if (level === 'error') return 'error';
  if (level === 'warn') return 'warning';
  return 'ok';
}
