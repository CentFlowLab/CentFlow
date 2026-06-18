export type AppLogLevel = 'debug' | 'info' | 'warn' | 'error';

export type AppLogSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AppLogEntry = {
  id: string;
  timestamp: string;
  level: AppLogLevel;
  severity: AppLogSeverity;
  source: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
};

import { withDiagnosticContext } from './runtime-context';

const MAX_ENTRIES = 250;
const listeners = new Set<(entries: AppLogEntry[]) => void>();

let entries: AppLogEntry[] = [];
let seq = 0;
let installed = false;

function notify() {
  const snapshot = [...entries];
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function formatArg(value: unknown): string {
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function severityForLevel(level: AppLogLevel, context?: Record<string, unknown>): AppLogSeverity {
  if (level === 'error') {
    if (context?.isFatal === true) return 'critical';
    return 'high';
  }
  if (level === 'warn') return 'medium';
  return 'low';
}

function pushEntry(entry: Omit<AppLogEntry, 'id' | 'timestamp' | 'severity'> & { timestamp?: string; severity?: AppLogSeverity }) {
  const mergedContext = entry.context ? withDiagnosticContext(entry.context) : withDiagnosticContext();
  const next: AppLogEntry = {
    id: `${Date.now()}-${++seq}`,
    timestamp: entry.timestamp ?? new Date().toISOString(),
    level: entry.level,
    severity: entry.severity ?? severityForLevel(entry.level, mergedContext),
    source: entry.source,
    message: entry.message,
    stack: entry.stack,
    context: mergedContext,
  };

  entries = [next, ...entries].slice(0, MAX_ENTRIES);
  notify();
  return next;
}

export function subscribeAppLog(listener: (entries: AppLogEntry[]) => void): () => void {
  listeners.add(listener);
  listener([...entries]);
  return () => listeners.delete(listener);
}

export function getAppLogEntries(): AppLogEntry[] {
  return [...entries];
}

export function clearAppLog(): void {
  entries = [];
  notify();
}

export function logAppEvent(
  level: AppLogLevel,
  source: string,
  message: string,
  context?: Record<string, unknown>,
): AppLogEntry {
  return pushEntry({ level, source, message, context });
}

export function logAppError(
  source: string,
  error: unknown,
  context?: Record<string, unknown>,
): AppLogEntry {
  const err = error instanceof Error ? error : new Error(formatArg(error));
  return pushEntry({
    level: 'error',
    source,
    message: err.message || 'Erro desconhecido',
    stack: err.stack,
    context: withDiagnosticContext(context),
  });
}

function captureConsoleStack(): string | undefined {
  const stack = new Error().stack;
  if (!stack) return undefined;
  const lines = stack.split('\n').slice(3, 8);
  return lines.length > 0 ? lines.join('\n') : undefined;
}

export function logFromConsole(level: AppLogLevel, args: unknown[], source = 'console') {
  const message = args.map(formatArg).join(' ');
  const stack = level === 'warn' || level === 'error' ? captureConsoleStack() : undefined;
  return pushEntry({ level, source, message, stack });
}

export function exportAppLogText(): string {
  return getAppLogEntries()
    .map((entry) => {
      const ctx = entry.context
        ? Object.entries(entry.context)
            .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
            .join('\n')
        : '';
      const stack = entry.stack ? `\nstack:\n${entry.stack}` : '';
      const contextBlock = ctx ? `\n${ctx}` : '';
      return `[${entry.timestamp}] ${entry.severity.toUpperCase()} ${entry.level.toUpperCase()} (${entry.source})\n${entry.message}${contextBlock}${stack}`;
    })
    .join('\n\n---\n\n');
}

export function installGlobalDiagnostics(): void {
  if (installed) return;
  installed = true;

  logAppEvent('info', 'diagnostics', 'Sistema de diagnóstico activo');

  const original = {
    debug: console.debug.bind(console),
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  console.debug = (...args: unknown[]) => {
    logFromConsole('debug', args);
    original.debug(...args);
  };
  console.log = (...args: unknown[]) => {
    logFromConsole('info', args);
    original.log(...args);
  };
  console.info = (...args: unknown[]) => {
    logFromConsole('info', args);
    original.info(...args);
  };
  console.warn = (...args: unknown[]) => {
    logFromConsole('warn', args);
    original.warn(...args);
  };
  console.error = (...args: unknown[]) => {
    logFromConsole('error', args);
    original.error(...args);
  };

  const rejectionHandler = (event: PromiseRejectionEvent | { reason?: unknown }) => {
    const reason = event.reason ?? 'Promise rejection';
    logAppError('unhandled-rejection', reason, { component: 'promise' });
  };

  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('unhandledrejection', rejectionHandler as EventListener);
  }

  const errorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void; setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void } }).ErrorUtils;

  if (errorUtils?.getGlobalHandler && errorUtils?.setGlobalHandler) {
    const defaultHandler = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      logAppError('global-handler', error, {
        isFatal: Boolean(isFatal),
        component: 'react-native',
      });
      defaultHandler?.(error, isFatal);
    });
  }
}
