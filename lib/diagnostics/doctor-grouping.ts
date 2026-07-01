import type { AppLogEntry } from './app-log';
import type {
  DiagnosticOperation,
  DiagnosticTimelinePhase,
  DoctorCategory,
  OperationStatus,
  TimelinePhaseStatus,
} from './doctor-types';
import { humanizeError, humanizeStep, resolveOperationCategory, resolveOperationTitle } from './doctor-humanize';

const OPERATION_START_STEPS = new Set([
  'save_click',
  'mutation_start',
  'ocr_start',
  'open',
  'modal_open',
  'service_start',
  'link_received',
  'upload_start',
  'validation_start',
]);

const OPERATION_END_STEPS = new Set([
  'mutation_settled',
  'mutation_error',
  'parse_success',
  'parse_failed',
  'ocr_error',
  'save_success',
  'save_error',
  'stall_detected',
  'service_success',
  'service_insert_error',
  'service_goal_update_error',
  'modal_close',
]);

const PHASE_ORDER = ['validation', 'supabase', 'cache', 'queries', 'ui', 'completed', 'other'] as const;

type PhaseKey = (typeof PHASE_ORDER)[number];

function classifyPhase(entry: AppLogEntry): PhaseKey {
  const step = String(entry.context?.step ?? entry.message).toLowerCase();
  const source = entry.source.toLowerCase();

  if (/validation/.test(step)) return 'validation';
  if (/supabase|service_insert|service_start|service_done|service_/.test(step)) return 'supabase';
  if (/cache/.test(step)) return 'cache';
  if (/react-query/.test(source)) return 'queries';
  if (/modal_close|sheet_close|form_close|ui refresh/.test(step)) return 'ui';
  if (/settled|success|done|completed|parse_success|save_success/.test(step)) return 'completed';
  return 'other';
}

const PHASE_LABELS: Record<PhaseKey, string> = {
  validation: 'Validação',
  supabase: 'Supabase',
  cache: 'Cache',
  queries: 'Queries',
  ui: 'UI',
  completed: 'Concluído',
  other: 'Outros',
};

function phaseStatusFromEntry(entry: AppLogEntry): TimelinePhaseStatus {
  if (entry.level === 'error') return 'error';
  if (entry.level === 'warn' || entry.context?.step === 'stall_detected') return 'warning';
  return 'success';
}

function worstPhaseStatus(a: TimelinePhaseStatus, b: TimelinePhaseStatus): TimelinePhaseStatus {
  const rank: Record<TimelinePhaseStatus, number> = {
    error: 4,
    warning: 3,
    pending: 2,
    skipped: 1,
    success: 0,
  };
  return rank[a] >= rank[b] ? a : b;
}

function buildTimeline(entries: AppLogEntry[]): DiagnosticTimelinePhase[] {
  const buckets = new Map<PhaseKey, DiagnosticTimelinePhase>();

  for (const entry of entries) {
    const phaseKey = classifyPhase(entry);
    const existing = buckets.get(phaseKey);
    const stepLabel = humanizeStep(String(entry.context?.step ?? entry.message));
    const status = phaseStatusFromEntry(entry);

    if (!existing) {
      buckets.set(phaseKey, {
        key: phaseKey,
        label: PHASE_LABELS[phaseKey],
        status,
        timestamp: entry.timestamp,
        steps: [stepLabel],
      });
    } else {
      existing.status = worstPhaseStatus(existing.status, status);
      if (!existing.steps.includes(stepLabel)) existing.steps.push(stepLabel);
    }
  }

  return PHASE_ORDER.filter((key) => buckets.has(key)).map((key) => buckets.get(key)!);
}

function resolveOperationStatus(entries: AppLogEntry[]): OperationStatus {
  const hasError = entries.some((e) => e.level === 'error');
  const hasStall = entries.some((e) => e.context?.step === 'stall_detected');
  const hasOffline = entries.some((e) => /offline|network|fetch failed/i.test(e.message));
  const hasWarn = entries.some((e) => e.level === 'warn');
  const hasSettled = entries.some((e) => {
    const step = String(e.context?.step ?? '');
    return OPERATION_END_STEPS.has(step) || step === 'mutation_success';
  });
  const hasCancelled = entries.some((e) => String(e.context?.step).includes('cancel'));

  if (hasOffline) return 'offline';
  if (hasError) return 'error';
  if (hasStall) return 'timeout';
  if (hasCancelled) return 'cancelled';
  if (hasWarn) return 'warning';
  if (hasSettled) return 'success';
  return 'running';
}

function groupKey(entry: AppLogEntry): string {
  const opId = entry.context?.operationId;
  if (typeof opId === 'string' && opId.length > 0) return opId;
  const action = String(entry.context?.action ?? entry.source);
  return action;
}

function shouldStartNewGroup(entry: AppLogEntry, current: AppLogEntry[], gapMs: number): boolean {
  if (current.length === 0) return false;

  const step = String(entry.context?.step ?? '');
  const opId = entry.context?.operationId;
  const currentOpId = current[0]?.context?.operationId;

  const currentSource = current[0]?.source;
  if (currentSource && entry.source !== currentSource && !opId && !currentOpId) return true;

  if (typeof opId === 'string' && typeof currentOpId === 'string' && opId !== currentOpId) return true;
  if (OPERATION_START_STEPS.has(step) && gapMs > 500) return true;
  if (gapMs > 12_000) return true;

  const currentAction = String(current[0]?.context?.action ?? current[0]?.source);
  const nextAction = String(entry.context?.action ?? entry.source);
  if (currentAction !== nextAction && gapMs > 2000 && OPERATION_START_STEPS.has(step)) return true;

  return false;
}

function shouldCloseGroup(entry: AppLogEntry): boolean {
  const step = String(entry.context?.step ?? '');
  return OPERATION_END_STEPS.has(step) || entry.level === 'error';
}

export function groupAppLogEntries(entries: AppLogEntry[]): DiagnosticOperation[] {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const rawGroups: AppLogEntry[][] = [];
  let current: AppLogEntry[] = [];
  let lastTs = 0;

  for (const entry of sorted) {
    const ts = new Date(entry.timestamp).getTime();
    const gapMs = lastTs > 0 ? ts - lastTs : 0;

    if (shouldStartNewGroup(entry, current, gapMs)) {
      rawGroups.push(current);
      current = [entry];
    } else {
      current.push(entry);
    }

    lastTs = ts;

    if (shouldCloseGroup(entry)) {
      rawGroups.push(current);
      current = [];
      lastTs = 0;
    }
  }

  if (current.length > 0) rawGroups.push(current);

  return rawGroups
    .filter((group) => group.length > 0)
    .map((group, index) => buildOperation(group, index))
    .reverse();
}

function buildOperation(entries: AppLogEntry[], index: number): DiagnosticOperation {
  const startedAt = entries[0].timestamp;
  const endedAt = entries[entries.length - 1].timestamp;
  const durationMs = Math.max(
    0,
    new Date(endedAt).getTime() - new Date(startedAt).getTime(),
  );

  const action = String(entries.find((e) => e.context?.action)?.context?.action ?? entries[0].source);
  const source = entries[0].source;
  const category: DoctorCategory = resolveOperationCategory(action, source);
  const status = resolveOperationStatus(entries);
  const errorEntry = [...entries].reverse().find((e) => e.level === 'error');
  const humanError = errorEntry ? humanizeError(errorEntry) : undefined;
  const screen = String(entries.find((e) => e.context?.screen)?.context?.screen ?? '');
  const timeline = buildTimeline(entries);

  return {
    id: `${groupKey(entries[0])}-${index}-${startedAt}`,
    title: resolveOperationTitle(action, entries),
    status,
    category,
    origin: source,
    startedAt,
    endedAt,
    durationMs: durationMs || 1,
    eventCount: entries.length,
    timeline,
    entries,
    humanError,
    screen: screen || undefined,
    action,
  };
}

export function filterOperations(
  operations: DiagnosticOperation[],
  filter: import('./doctor-types').DoctorFilter,
  search: string,
): DiagnosticOperation[] {
  const query = search.trim().toLowerCase();

  return operations.filter((op) => {
    if (filter === 'errors' && op.status !== 'error') return false;
    if (filter === 'warnings' && op.status !== 'warning' && op.status !== 'timeout') return false;
    if (filter === 'movement' && op.category !== 'movement') return false;
    if (filter === 'goal' && op.category !== 'goal') return false;
    if (filter === 'account' && op.category !== 'account') return false;
    if (filter === 'ocr' && op.category !== 'ocr') return false;
    if (filter === 'auth' && op.category !== 'auth') return false;
    if (filter === 'supabase' && op.category !== 'supabase') return false;
    if (filter === 'sync' && op.category !== 'sync' && op.category !== 'cache') return false;
    if (filter === 'performance' && op.durationMs < 300) return false;

    if (!query) return true;

    const haystack = [
      op.title,
      op.action,
      op.origin,
      op.screen,
      op.humanError?.message,
      ...op.entries.map((e) => e.message),
      ...op.entries.map((e) => String(e.context?.step ?? '')),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}
