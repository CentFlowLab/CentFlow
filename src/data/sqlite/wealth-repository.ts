import {
  hasErrors,
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
  created_at: string;
  updated_at: string;
};

const COLUMNS = `id, name, type, amount, currency, valued_on, created_at, updated_at`;

function toItem(row: WealthRow): WealthItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    valuedOn: row.valued_on,
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
          return { id, ...input, createdAt: timestamp, updatedAt: timestamp };
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
          await tx.run(
            `UPDATE wealth_items
                SET name = ?, type = ?, amount = ?, currency = ?, valued_on = ?, updated_at = ?
              WHERE id = ?`,
            [input.name, input.type, input.amount, input.currency, input.valuedOn, timestamp, id],
          );
          return { ...toItem(existing), ...input, updatedAt: timestamp };
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
