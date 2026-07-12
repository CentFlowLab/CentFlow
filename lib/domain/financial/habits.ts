import type { Transaction } from '@/lib/domain/transaction.types';

import { parseIsoDate, isTransactionOccurred } from './dates';
import { formatMoney, roundMoney } from './money';
import { countsAsVariableSpendTransaction } from './savings-margin';

/** Janela de análise e limiares de confiança. */
export const HABIT_LOOKBACK_WEEKS = 8;
export const HABIT_MIN_HISTORY_WEEKS = 6;
export const HABIT_MIN_OCCURRENCES = 4;
/** Coeficiente de variação máximo para considerar valores consistentes. */
export const HABIT_MAX_AMOUNT_CV = 0.55;
/** Multiplicador sobre a média do hábito para sinalizar desvio (não mediana global). */
export const HABIT_DEVIATION_MULTIPLIER = 1.45;

export type SpendingHabit = {
  /** Identificador estável para ignorar o padrão. */
  id: string;
  category: string;
  categoryLabel: string;
  merchantKey: string;
  merchantLabel: string;
  /** 0 = domingo … 6 = sábado (Date.getDay). */
  dayOfWeek: number;
  dayLabel: string;
  averageAmount: number;
  occurrenceCount: number;
  /** 0–1, baseado em ocorrências e consistência de valor. */
  confidence: number;
  transactionIds: string[];
};

export type HabitDeviation = {
  habit: SpendingHabit;
  transactionId: string;
  actualAmount: number;
};

const DAY_LABELS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
] as const;

const DAY_PREP = [
  'ao domingo',
  'à segunda',
  'à terça',
  'à quarta',
  'à quinta',
  'à sexta',
  'ao sábado',
] as const;

type HabitGroup = {
  category: string;
  categoryLabel: string;
  merchantKey: string;
  merchantLabel: string;
  dayOfWeek: number;
  amounts: number[];
  transactionIds: string[];
};

export function normalizeHabitMerchantKey(tx: Transaction): string {
  const raw = (tx.merchant?.trim() || tx.description?.trim() || tx.categoryLabel || '').toLowerCase();
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

export function habitMerchantLabel(tx: Transaction): string {
  return tx.merchant?.trim() || tx.description?.trim() || tx.categoryLabel || 'Movimento';
}

export function buildHabitId(
  category: string,
  dayOfWeek: number,
  merchantKey: string,
): string {
  return `habit:${category}:${dayOfWeek}:${merchantKey}`;
}

function coefficientOfVariation(values: number[]): number {
  if (values.length === 0) return 1;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean <= 0) return 1;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function calculateHabitConfidence(occurrenceCount: number, cv: number): number {
  const countScore = Math.min(1, (occurrenceCount - HABIT_MIN_OCCURRENCES + 1) / 4);
  const consistencyScore = Math.max(0, 1 - cv / HABIT_MAX_AMOUNT_CV);
  const raw = 0.3 + countScore * 0.5 + consistencyScore * 0.2;
  return Math.round(Math.min(1, Math.max(0, raw)) * 100) / 100;
}

function amountsWithinReasonableBand(amounts: number[], average: number): boolean {
  if (average <= 0) return false;
  const low = average * 0.35;
  const high = average * 2.8;
  return amounts.every((amount) => amount >= low && amount <= high);
}

/** Histórico mínimo (~6 semanas) antes de detetar padrões. */
export function hasEnoughHistoryForHabits(
  transactions: Transaction[],
  asOf: Date = new Date(),
): boolean {
  const eligible = transactions.filter(
    (tx) => countsAsVariableSpendTransaction(tx) && isTransactionOccurred(tx.date, asOf),
  );
  if (eligible.length < 12) return false;

  const times = eligible
    .map((tx) => parseIsoDate(tx.date).getTime())
    .filter((time) => !Number.isNaN(time));
  if (times.length === 0) return false;

  const spanDays = (Math.max(...times) - Math.min(...times)) / (24 * 60 * 60 * 1000);
  return spanDays >= HABIT_MIN_HISTORY_WEEKS * 7;
}

function filterHabitCandidateTransactions(
  transactions: Transaction[],
  asOf: Date,
): Transaction[] {
  const cutoff = new Date(asOf);
  cutoff.setDate(cutoff.getDate() - HABIT_LOOKBACK_WEEKS * 7);

  return transactions.filter((tx) => {
    if (!countsAsVariableSpendTransaction(tx)) return false;
    if (!isTransactionOccurred(tx.date, asOf)) return false;
    const parsed = parseIsoDate(tx.date);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed >= cutoff;
  });
}

/**
 * Identifica hábitos de gasto: mesma categoria/comerciante no mesmo dia da semana,
 * com valores consistentes e pelo menos 4 ocorrências nas últimas 8 semanas.
 */
export function detectSpendingHabits(
  transactions: Transaction[],
  options?: {
    asOf?: Date;
    ignoredHabitIds?: string[];
  },
): SpendingHabit[] {
  const asOf = options?.asOf ?? new Date();
  const ignored = new Set(options?.ignoredHabitIds ?? []);

  if (!hasEnoughHistoryForHabits(transactions, asOf)) return [];

  const candidates = filterHabitCandidateTransactions(transactions, asOf);
  const groups = new Map<string, HabitGroup>();

  for (const tx of candidates) {
    const parsed = parseIsoDate(tx.date);
    const dayOfWeek = parsed.getDay();
    const merchantKey = normalizeHabitMerchantKey(tx);
    if (!merchantKey) continue;

    const groupKey = `${tx.category}|${dayOfWeek}|${merchantKey}`;
    const current = groups.get(groupKey) ?? {
      category: tx.category,
      categoryLabel: tx.categoryLabel,
      merchantKey,
      merchantLabel: habitMerchantLabel(tx),
      dayOfWeek,
      amounts: [],
      transactionIds: [],
    };

    current.amounts.push(tx.amount);
    current.transactionIds.push(tx.id);
    groups.set(groupKey, current);
  }

  const habits: SpendingHabit[] = [];

  for (const group of groups.values()) {
    if (group.amounts.length < HABIT_MIN_OCCURRENCES) continue;

    const average = roundMoney(
      group.amounts.reduce((sum, value) => sum + value, 0) / group.amounts.length,
    );
    const cv = coefficientOfVariation(group.amounts);
    if (cv > HABIT_MAX_AMOUNT_CV) continue;
    if (!amountsWithinReasonableBand(group.amounts, average)) continue;

    const id = buildHabitId(group.category, group.dayOfWeek, group.merchantKey);
    if (ignored.has(id)) continue;

    habits.push({
      id,
      category: group.category,
      categoryLabel: group.categoryLabel,
      merchantKey: group.merchantKey,
      merchantLabel: group.merchantLabel,
      dayOfWeek: group.dayOfWeek,
      dayLabel: DAY_LABELS[group.dayOfWeek],
      averageAmount: average,
      occurrenceCount: group.amounts.length,
      confidence: calculateHabitConfidence(group.amounts.length, cv),
      transactionIds: group.transactionIds,
    });
  }

  return habits.sort((a, b) => b.confidence - a.confidence || b.occurrenceCount - a.occurrenceCount);
}

export function transactionMatchesHabit(tx: Transaction, habit: SpendingHabit): boolean {
  if (!countsAsVariableSpendTransaction(tx)) return false;
  if (tx.category !== habit.category) return false;

  const parsed = parseIsoDate(tx.date);
  if (Number.isNaN(parsed.getTime())) return false;
  if (parsed.getDay() !== habit.dayOfWeek) return false;

  const merchantKey = normalizeHabitMerchantKey(tx);
  return merchantKey === habit.merchantKey;
}

/** Transacções recentes (14 dias) que excedem a média do hábito específico. */
export function findHabitDeviations(
  transactions: Transaction[],
  habits: SpendingHabit[],
  options?: { asOf?: Date },
): HabitDeviation[] {
  const asOf = options?.asOf ?? new Date();
  const cutoff = new Date(asOf);
  cutoff.setDate(cutoff.getDate() - 14);

  const deviations: HabitDeviation[] = [];

  for (const habit of habits) {
    const threshold = roundMoney(habit.averageAmount * HABIT_DEVIATION_MULTIPLIER);

    for (const tx of transactions) {
      if (!transactionMatchesHabit(tx, habit)) continue;
      const parsed = parseIsoDate(tx.date);
      if (Number.isNaN(parsed.getTime()) || parsed < cutoff) continue;
      if (!isTransactionOccurred(tx.date, asOf)) continue;
      if (tx.amount <= threshold) continue;

      deviations.push({
        habit,
        transactionId: tx.id,
        actualAmount: tx.amount,
      });
      break;
    }
  }

  return deviations;
}

/** Mensagem neutra — contexto informativo, sem julgamento. */
export function buildHabitDeviationMessage(habit: SpendingHabit, actualAmount: number): string {
  const dayPrep = DAY_PREP[habit.dayOfWeek];
  const place =
    habit.merchantLabel && habit.merchantLabel !== habit.categoryLabel
      ? `${habit.categoryLabel} (${habit.merchantLabel})`
      : habit.categoryLabel;

  return `Normalmente gastas ~${formatMoney(habit.averageAmount)} ${dayPrep} em ${place}. Esta semana foram ${formatMoney(actualAmount)}.`;
}

export function buildHabitDeviationTitle(habit: SpendingHabit): string {
  return `Padrão habitual — ${habit.categoryLabel}`;
}
