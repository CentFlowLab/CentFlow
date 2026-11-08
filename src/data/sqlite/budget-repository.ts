import {
  hasErrors,
  validateBudgetInput,
  ValidationError,
  type Budget,
  type BudgetInput,
  type BudgetPeriod,
  type Id,
} from '@/core/finance';

import type { SqlExecutor } from '../db/sql-database';
import { NotFoundError } from '../errors';
import type { BudgetRepository } from '../repositories/types';
import { write, type SqliteRepositoryContext } from './context';

type BudgetRow = {
  id: string;
  category_id: string;
  amount: number;
  currency: string;
  period: BudgetPeriod;
  starts_on: string;
  created_at: string;
  updated_at: string;
};

const COLUMNS = `id, category_id, amount, currency, period, starts_on, created_at, updated_at`;

function toBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    categoryId: row.category_id,
    amount: row.amount,
    currency: row.currency,
    period: row.period,
    startsOn: row.starts_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function prepare(raw: BudgetInput): BudgetInput {
  const input: BudgetInput = {
    categoryId: raw.categoryId.trim(),
    amount: raw.amount,
    currency: raw.currency.trim().toUpperCase(),
    period: raw.period,
    startsOn: raw.startsOn,
  };
  const errors = validateBudgetInput(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

async function assertExpenseCategory(tx: SqlExecutor, categoryId: Id): Promise<void> {
  const category = await tx.first<{ type: string }>(
    'SELECT type FROM categories WHERE id = ? AND deleted_at IS NULL',
    [categoryId],
  );
  if (!category) throw new ValidationError({ categoryId: 'categoryNotFound' });
  if (category.type !== 'expense')
    throw new ValidationError({ categoryId: 'categoryTypeMismatch' });
}

async function assertUnique(tx: SqlExecutor, categoryId: Id, exceptId: Id | null): Promise<void> {
  const existing = await tx.first<{ id: string }>(
    'SELECT id FROM budgets WHERE category_id = ? AND deleted_at IS NULL',
    [categoryId],
  );
  if (existing && existing.id !== exceptId) {
    throw new ValidationError({ categoryId: 'duplicateCategory' });
  }
}

export function createSqliteBudgetRepository(context: SqliteRepositoryContext): BudgetRepository {
  const { db } = context;

  return {
    async list() {
      const rows = await db.all<BudgetRow>(
        `SELECT ${COLUMNS} FROM budgets WHERE deleted_at IS NULL ORDER BY created_at, rowid`,
      );
      return rows.map(toBudget);
    },

    async get(id) {
      const row = await db.first<BudgetRow>(
        `SELECT ${COLUMNS} FROM budgets WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      return row ? toBudget(row) : null;
    },

    create(raw) {
      return write(context, ['budgets'], () =>
        db.transaction(async (tx) => {
          const input = prepare(raw);
          await assertExpenseCategory(tx, input.categoryId);
          await assertUnique(tx, input.categoryId, null);
          const id = context.newId();
          const timestamp = context.now();
          await tx.run(
            `INSERT INTO budgets
               (id, category_id, amount, currency, period, starts_on, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              input.categoryId,
              input.amount,
              input.currency,
              input.period,
              input.startsOn,
              timestamp,
              timestamp,
            ],
          );
          return { id, ...input, createdAt: timestamp, updatedAt: timestamp };
        }),
      );
    },

    update(id, raw) {
      return write(context, ['budgets'], () =>
        db.transaction(async (tx) => {
          const existing = await tx.first<BudgetRow>(
            `SELECT ${COLUMNS} FROM budgets WHERE id = ? AND deleted_at IS NULL`,
            [id],
          );
          if (!existing) throw new NotFoundError('budget', id);
          const input = prepare(raw);
          await assertExpenseCategory(tx, input.categoryId);
          await assertUnique(tx, input.categoryId, id);
          const timestamp = context.now();
          await tx.run(
            `UPDATE budgets
             SET category_id = ?, amount = ?, currency = ?, period = ?, starts_on = ?, updated_at = ?
             WHERE id = ?`,
            [
              input.categoryId,
              input.amount,
              input.currency,
              input.period,
              input.startsOn,
              timestamp,
              id,
            ],
          );
          return { ...toBudget(existing), ...input, updatedAt: timestamp };
        }),
      );
    },

    delete(id) {
      return write(context, ['budgets'], async () => {
        const timestamp = context.now();
        const { changes } = await db.run(
          'UPDATE budgets SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
          [timestamp, timestamp, id],
        );
        if (changes === 0) throw new NotFoundError('budget', id);
      });
    },
  };
}
