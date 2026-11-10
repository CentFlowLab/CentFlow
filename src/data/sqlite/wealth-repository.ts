import {
  hasErrors,
  recordValuation,
  type WealthValuation,
  validateWealthItemInput,
  ValidationError,
  type WealthItem,
  type WealthItemInput,
} from '@/core/finance';

import { NotFoundError } from '../errors';
import type { WealthRepository } from '../repositories/types';
import { write, type SqliteRepositoryContext } from './context';

type WealthRow = {
  id: string;
  name: string;
  type: WealthItem['type'];
  amount: number;
  currency: string;
  valued_on: string;
  value_history: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = `id, name, type, amount, currency, valued_on, value_history, created_at, updated_at`;

/** Lê o histórico guardado; um valor estragado conta como vazio em vez de partir a lista. */
function parseHistory(text: string | null): WealthValuation[] {
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

function serializeHistory(history: readonly WealthValuation[]): string | null {
  if (history.length === 0) return null;
  return JSON.stringify(
    history.map((point) => ({ amount: point.amount, valued_on: point.valuedOn })),
  );
}

function toItem(row: WealthRow): WealthItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    valuedOn: row.valued_on,
    valueHistory: parseHistory(row.value_history),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function prepare(raw: WealthItemInput): WealthItemInput {
  const input: WealthItemInput = {
    name: raw.name.trim(),
    type: raw.type,
    amount: raw.amount,
    currency: raw.currency.trim().toUpperCase(),
    valuedOn: raw.valuedOn,
  };
  const errors = validateWealthItemInput(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

export function createSqliteWealthRepository(context: SqliteRepositoryContext): WealthRepository {
  const { db } = context;

  return {
    async list() {
      const rows = await db.all<WealthRow>(
        `SELECT ${COLUMNS} FROM wealth_items WHERE deleted_at IS NULL ORDER BY name, rowid`,
      );
      return rows.map(toItem);
    },

    async get(id) {
      const row = await db.first<WealthRow>(
        `SELECT ${COLUMNS} FROM wealth_items WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      return row ? toItem(row) : null;
    },

    create(raw) {
      return write(context, ['wealth_items'], () =>
        db.transaction(async (tx) => {
          const input = prepare(raw);
          const id = context.newId();
          const timestamp = context.now();
          await tx.run(
            `INSERT INTO wealth_items (id, name, type, amount, currency, valued_on, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              input.name,
              input.type,
              input.amount,
              input.currency,
              input.valuedOn,
              timestamp,
              timestamp,
            ],
          );
          return { id, ...input, valueHistory: [], createdAt: timestamp, updatedAt: timestamp };
        }),
      );
    },

    update(id, raw) {
      return write(context, ['wealth_items'], () =>
        db.transaction(async (tx) => {
          const existing = await tx.first<WealthRow>(
            `SELECT ${COLUMNS} FROM wealth_items WHERE id = ? AND deleted_at IS NULL`,
            [id],
          );
          if (!existing) throw new NotFoundError('wealth_item', id);
          const input = prepare(raw);
          const timestamp = context.now();
          const before = toItem(existing);
          // Guarda a avaliação anterior (ou corrige a do mesmo dia) para o histórico do património.
          const valueHistory = recordValuation(before, input);
          await tx.run(
            `UPDATE wealth_items
                SET name = ?, type = ?, amount = ?, currency = ?, valued_on = ?, value_history = ?,
                    updated_at = ?
              WHERE id = ?`,
            [
              input.name,
              input.type,
              input.amount,
              input.currency,
              input.valuedOn,
              serializeHistory(valueHistory),
              timestamp,
              id,
            ],
          );
          return { ...before, ...input, valueHistory, updatedAt: timestamp };
        }),
      );
    },

    delete(id) {
      return write(context, ['wealth_items'], async () => {
        const timestamp = context.now();
        const { changes } = await db.run(
          `UPDATE wealth_items SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
          [timestamp, timestamp, id],
        );
        if (changes === 0) throw new NotFoundError('wealth_item', id);
      });
    },
  };
}
