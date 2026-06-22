const SENSITIVE_KEY_PATTERN =
  /password|token|secret|authorization|bearer|otp|magic|refresh|access_token|api[_-]?key|credential/i;

const SENSITIVE_VALUE_PATTERN =
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|Bearer\s+\S+|password\s*[:=]\s*\S+/i;

export function sanitizeLogValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    if (SENSITIVE_VALUE_PATTERN.test(value)) return '[REDACTED]';
    if (value.length > 240) return `${value.slice(0, 120)}…[truncated]`;
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeLogValue);
  }

  if (typeof value === 'object') {
    return sanitizeLogContext(value as Record<string, unknown>);
  }

  return value;
}

export function sanitizeLogContext(
  context?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!context) return undefined;

  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      safe[key] = '[REDACTED]';
      continue;
    }
    safe[key] = sanitizeLogValue(value);
  }
  return safe;
}

export function sanitizeLogMessage(message: string): string {
  if (SENSITIVE_VALUE_PATTERN.test(message)) return '[REDACTED]';
  return message;
}
