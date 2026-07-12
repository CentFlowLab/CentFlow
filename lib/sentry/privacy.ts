/**
 * Redacção de dados sensíveis antes de enviar eventos ao Sentry.
 * Nunca enviar valores monetários, descrições de transações, IBANs ou IDs de utilizador em claro.
 */

const REDACTED = '[REDACTED]';

const SENSITIVE_KEY_RE =
  /(amount|balance|saldo|valor|value|price|total|iban|account.?number|description|memo|merchant|transaction.?id|user.?id|email|password|token|secret|api[_-]?key|anon[_-]?key|authorization)/i;

const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /eyJ[A-Za-z0-9._-]{10,}/g,
  /sb_(?:publishable|secret)_[A-Za-z0-9._-]+/g,
  /sbp_[A-Za-z0-9]+/g,
  /\bre_[A-Za-z0-9_-]{8,}/g,
  /€\s*[\d.,]+/g,
  /EUR\s*[\d.,]+/gi,
  /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\s*€/g,
  /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/gi,
];

export function redactString(input: string): string {
  let output = input;
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    output = output.replace(pattern, REDACTED);
  }
  return output;
}

export function redactSentryValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return REDACTED;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number') return REDACTED;
  if (Array.isArray(value)) return value.map((item) => redactSentryValue(item, depth + 1));
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY_RE.test(key) ? REDACTED : redactSentryValue(val, depth + 1);
    }
    return output;
  }
  return value;
}

export function scrubSentryEvent<T extends { message?: string; extra?: Record<string, unknown> }>(
  event: T,
): T | null {
  if (event.message) {
    event.message = redactString(event.message);
  }
  if (event.extra) {
    event.extra = redactSentryValue(event.extra) as Record<string, unknown>;
  }
  return event;
}

/** Hash anónimo estável para correlacionar sessões sem expor o ID real. */
export async function hashUserIdForSentry(userId: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(`centflow-sentry:${userId}`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes
      .slice(0, 8)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return 'anon';
  }
}
