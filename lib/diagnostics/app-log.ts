export type AppLogLevel = 'debug' | 'info' | 'warn' | 'error';

export type AppLogEntry = {
  id: string;
  timestamp: string;
  level: AppLogLevel;
  source: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
};

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

function pushEntry(entry: Omit<AppLogEntry, 'id' | 'timestamp'> & { timestamp?: string }) {
  const next: AppLogEntry = {
    id: `${Date.now()}-${++seq}`,
    timestamp: entry.timestamp ?? new Date().toISOString(),
    level: entry.level,
    source: entry.source,
    message: entry.message,
    stack: entry.stack,
    context: entry.context,
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
    context,
  });
}

export function logFromConsole(level: AppLogLevel, args: unknown[], source = 'console') {
  const message = args.map(formatArg).join(' ');
  return pushEntry({ level, source, message });
}

export function exportAppLogText(): string {
  return getAppLogEntries()
    .map((entry) => {
      const ctx = entry.context ? `\ncontext: ${JSON.stringify(entry.context)}` : '';
      const stack = entry.stack ? `\n${entry.stack}` : '';
      return `[${entry.timestamp}] ${entry.level.toUpperCase()} (${entry.source}) ${entry.message}${ctx}${stack}`;
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
    logAppError('unhandled-rejection', event.reason ?? 'Promise rejection');
  };

  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('unhandledrejection', rejectionHandler as EventListener);
  }

  const errorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void; setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void } }).ErrorUtils;

  if (errorUtils?.getGlobalHandler && errorUtils?.setGlobalHandler) {
    const defaultHandler = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      logAppError('global-handler', error, { isFatal: Boolean(isFatal) });
      defaultHandler?.(error, isFatal);
    });
  }
}
