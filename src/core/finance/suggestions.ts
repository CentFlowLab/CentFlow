import { normalizeSearchText } from '../text/search';
import type { CalendarDate } from './dates';
import type { EntryType, Id } from './types';

/** Movimento do histórico usado para sugerir (só dados reais da própria pessoa). */
export type HistoryEntry = {
  type: EntryType;
  description: string;
  categoryId: Id | null;
  accountId: Id;
  amount: number;
  date: CalendarDate;
};

/** Uma escolha só é sugerida com pelo menos 2 usos e 60 % dos casos: sem ambiguidade. */
export const SUGGESTION_MIN_USES = 2;
export const SUGGESTION_MIN_SHARE = 0.6;

export function normalizeDescription(value: string): string {
  return normalizeSearchText(value).trim().replace(/\s+/g, ' ');
}

function dominant<T>(values: readonly T[]): T | null {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  if (bestCount < SUGGESTION_MIN_USES || bestCount / values.length < SUGGESTION_MIN_SHARE) {
    return null;
  }
  return best;
}

export type EntrySuggestion = {
  type: EntryType;
  /** Como a pessoa o escreveu da última vez. */
  description: string;
  categoryId: Id | null;
  accountId: Id | null;
  uses: number;
  lastDate: CalendarDate;
};

function summarize(group: readonly HistoryEntry[]): EntrySuggestion {
  const latest = [...group].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0]!;
  return {
    type: latest.type,
    description: latest.description.trim(),
    categoryId: dominant(group.map((entry) => entry.categoryId)),
    accountId: dominant(group.map((entry) => entry.accountId)),
    uses: group.length,
    lastDate: latest.date,
  };
}

function groups(history: readonly HistoryEntry[]): Map<string, HistoryEntry[]> {
  const byKey = new Map<string, HistoryEntry[]>();
  for (const entry of history) {
    if (entry.type === 'transfer') continue;
    const key = normalizeDescription(entry.description);
    if (key === '') continue;
    const fullKey = `${entry.type}:${key}`;
    const list = byKey.get(fullKey) ?? [];
    list.push(entry);
    byKey.set(fullKey, list);
  }
  return byKey;
}

/**
 * Movimentos que a pessoa repete (≥ 2 vezes), dos mais usados para os menos; empate: o mais
 * recente primeiro. A categoria e a conta só vêm preenchidas quando são claras.
 */
export function frequentEntries(history: readonly HistoryEntry[], limit = 6): EntrySuggestion[] {
  return [...groups(history).values()]
    .filter((group) => group.length >= SUGGESTION_MIN_USES)
    .map(summarize)
    .sort((a, b) => b.uses - a.uses || (a.lastDate < b.lastDate ? 1 : -1))
    .slice(0, limit);
}

/** Sugestão para uma descrição escrita (mesmo tipo), ou `null` se o histórico não for claro. */
export function suggestionFor(
  history: readonly HistoryEntry[],
  description: string,
  type: EntryType,
): EntrySuggestion | null {
  const key = normalizeDescription(description);
  if (key === '' || type === 'transfer') return null;
  const group = groups(history).get(`${type}:${key}`);
  if (!group) return null;
  const summary = summarize(group);
  return summary.categoryId || summary.accountId ? summary : null;
}

/** Outro movimento igual (tipo, valor, conta e dia): provável registo repetido. */
export function findDuplicate(
  history: readonly (Pick<HistoryEntry, 'type' | 'amount' | 'accountId' | 'date'> & { id: Id })[],
  candidate: Pick<HistoryEntry, 'type' | 'amount' | 'accountId' | 'date'>,
): Id | null {
  return (
    history.find(
      (entry) =>
        entry.type === candidate.type &&
        entry.amount === candidate.amount &&
        entry.accountId === candidate.accountId &&
        entry.date === candidate.date,
    )?.id ?? null
  );
}
