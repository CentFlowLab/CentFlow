import {
  hasErrors,
  validateSubscriptionInput,
  ValidationError,
  type Id,
  type Subscription,
  type SubscriptionInput,
  type SubscriptionPeriod,
  type SubscriptionStatus,
} from '@/core/finance';

import type { SqlExecutor } from '../db/sql-database';
import { NotFoundError } from '../errors';
import type { SubscriptionRepository } from '../repositories/types';
import { write, type SqliteRepositoryContext } from './context';

type SubscriptionRow = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  period: SubscriptionPeriod;
  status: SubscriptionStatus;
  starts_on: string;
  next_on: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = `id, name, amount, currency, period, status, starts_on, next_on, category_id,
  created_at, updated_at`;

function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    currency: row.currency,
    period: row.period,
    status: row.status,
    startsOn: row.starts_on,
    nextOn: row.next_on,
    categoryId: row.category_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function prepare(raw: SubscriptionInput): SubscriptionInput {
  const category = raw.categoryId?.trim() ?? '';
  const input: SubscriptionInput = {
    name: raw.name.trim(),
    amount: raw.amount,
    currency: raw.currency.trim().toUpperCase(),
    period: raw.period,
    status: raw.status,
    startsOn: raw.startsOn,
    nextOn: raw.nextOn,
    categoryId: category === '' ? null : category,
  };
  const errors = validateSubscriptionInput(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

async function assertExpenseCategory(tx: SqlExecutor, categoryId: Id | null): Promise<void> {
  if (categoryId === null) return;
  const category = await tx.first<{ type: string }>(
    'SELECT type FROM categories WHERE id = ? AND deleted_at IS NULL',
    [categoryId],
  );
  if (!category) throw new ValidationError({ categoryId: 'categoryNotFound' });
  if (category.type !== 'expense') {
    throw new ValidationError({ categoryId: 'categoryTypeMismatch' });
  }
}

export function createSqliteSubscriptionRepository(
  context: SqliteRepositoryContext,
): SubscriptionRepository {
  const { db } = context;

  return {
    async list() {
      const rows = await db.all<SubscriptionRow>(
        `SELECT ${COLUMNS} FROM subscriptions WHERE deleted_at IS NULL
         ORDER BY next_on, name, rowid`,
      );
      return rows.map(toSubscription);
    },

    async get(id) {
      const row = await db.first<SubscriptionRow>(
        `SELECT ${COLUMNS} FROM subscriptions WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      return row ? toSubscription(row) : null;
    },

    create(raw) {
      return write(context, ['subscriptions'], () =>
        db.transaction(async (tx) => {
          const input = prepare(raw);
          await assertExpenseCategory(tx, input.categoryId);
          const id = context.newId();
          const timestamp = context.now();
          await tx.run(
            `INSERT INTO subscriptions
               (id, name, amount, currency, period, status, starts_on, next_on, category_id,
                created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              input.name,
              input.amount,
              input.currency,
              input.period,
              input.status,
              input.startsOn,
              input.nextOn,
              input.categoryId,
              timestamp,
              timestamp,
            ],
          );
          return { id, ...input, createdAt: timestamp, updatedAt: timestamp };
        }),
      );
    },

    update(id, raw) {
      return write(context, ['subscriptions'], () =>
        db.transaction(async (tx) => {
          const existing = await tx.first<SubscriptionRow>(
            `SELECT ${COLUMNS} FROM subscriptions WHERE id = ? AND deleted_at IS NULL`,
            [id],
          );
          if (!existing) throw new NotFoundError('subscription', id);
          const input = prepare(raw);
          await assertExpenseCategory(tx, input.categoryId);
          const timestamp = context.now();
          await tx.run(
            `UPDATE subscriptions
                SET name = ?, amount = ?, currency = ?, period = ?, status = ?, starts_on = ?,
                    next_on = ?, category_id = ?, updated_at = ?
              WHERE id = ?`,
            [
              input.name,
              input.amount,
              input.currency,
              input.period,
              input.status,
              input.startsOn,
              input.nextOn,
              input.categoryId,
              timestamp,
              id,
            ],
          );
          return { ...toSubscription(existing), ...input, updatedAt: timestamp };
        }),
      );
    },

    delete(id) {
      return write(context, ['subscriptions'], async () => {
        const timestamp = context.now();
        const { changes } = await db.run(
          `UPDATE subscriptions SET deleted_at = ?, updated_at = ?
            WHERE id = ? AND deleted_at IS NULL`,
          [timestamp, timestamp, id],
        );
        if (changes === 0) throw new NotFoundError('subscription', id);
      });
    },
  };
}
