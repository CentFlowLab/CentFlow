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

import { withDiagnosticContext, getDiagnosticRuntimeContext } from './runtime-context';

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

/**
 * Redação de dados sensíveis antes de armazenar/exportar logs.
 * Defesa em profundidade: o Doctor está limitado a dev/beta, mas testers
 * podem exportar logs — tokens, chaves e credenciais nunca devem persistir.
 */
const SENSITIVE_KEY_RE =
  /(authorization|password|passwd|secret|token|api[_-]?key|anon[_-]?key|access[_-]?token|refresh[_-]?token|service[_-]?role|cron[_-]?secret)/i;

const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /eyJ[A-Za-z0-9._-]{10,}/g, // JWT
  /sb_(?:publishable|secret)_[A-Za-z0-9._-]+/g,
  /sbp_[A-Za-z0-9]+/g,
  /\bre_[A-Za-z0-9_-]{8,}/g, // Resend API key
];

const REDACTED = '[REDACTED]';

function redactString(input: string): string {
  let output = input;
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    output = output.replace(pattern, REDACTED);
  }
  return output;
}

function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return value;
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY_RE.test(key) ? REDACTED : redactValue(val, depth + 1);
    }
    return output;
  }
  return value;
}

function redactContext(
  context?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!context) return context;
  return redactValue(context) as Record<string, unknown>;
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
    message: redactString(entry.message),
    stack: entry.stack ? redactString(entry.stack) : undefined,
    context: redactContext(mergedContext),
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
    const { screen, action } = getDiagnosticRuntimeContext();
    logAppError('unhandled-rejection', reason, {
      component: 'promise',
      action: `unhandled_rejection:${action}`,
      screen,
    });
  };

  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('unhandledrejection', rejectionHandler as EventListener);
  }

  const errorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void; setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void } }).ErrorUtils;

  if (errorUtils?.getGlobalHandler && errorUtils?.setGlobalHandler) {
    const defaultHandler = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      const { screen, action } = getDiagnosticRuntimeContext();
      logAppError('global-handler', error, {
        isFatal: Boolean(isFatal),
        component: 'react-native',
        action: `global_error:${action}`,
        screen,
      });
      defaultHandler?.(error, isFatal);
    });
  }
}
