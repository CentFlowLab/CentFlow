import type { WealthValuation } from '@/core/finance';

/** Lê o histórico guardado; um valor estragado conta como vazio em vez de partir a lista. */
export function parseHistory(text: string | null): WealthValuation[] {
  if (!text) return [];
  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((point) => {
      const item = point as { amount?: unknown; valued_on?: unknown };
      return Number.isSafeInteger(item.amount) && typeof item.valued_on === 'string'
        ? [{ amount: item.amount as number, valuedOn: item.valued_on }]
        : [];
    });
  } catch {
    return [];
  }
}

export function serializeHistory(history: readonly WealthValuation[]): string | null {
  if (history.length === 0) return null;
  return JSON.stringify(
    history.map((point) => ({ amount: point.amount, valued_on: point.valuedOn })),
  );
}
