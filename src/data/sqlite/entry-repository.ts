import {
  hasErrors,
  normalizeEntryInput,
  validateEntryInput,
  ValidationError,
  type Category,
  type Entry,
  type EntryInput,
  type EntryValidationContext,
  type Id,
} from '@/core/finance';
import { normalizeSearchText } from '@/core/text/search';

import type { SqlExecutor, SqlValue } from '../db/sql-database';
import { NotFoundError } from '../errors';
import type { EntryAggregate, EntryFilter, EntryRepository } from '../repositories/types';
import { write, type SqliteRepositoryContext } from './context';

type EntryRow = {
  id: string;
  type: Entry['type'];
  amount: number;
  description: string;
  category_id: string | null;
  account_id: string;
  destination_account_id: string | null;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = `e.id, e.type, e.amount, e.description, e.category_id, e.account_id,
  e.destination_account_id, e.date, e.notes, e.created_at, e.updated_at`;

const MAX_PAGE_SIZE = 500;

function toEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    description: row.description,
    categoryId: row.category_id,
    accountId: row.account_id,
    destinationAccountId: row.destination_account_id,
    date: row.date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function buildWhere(filter: EntryFilter): { sql: string; params: SqlValue[] } {
  const clauses = ['e.deleted_at IS NULL'];
  const params: SqlValue[] = [];
  const search = filter.search ? normalizeSearchText(filter.search) : '';
  if (search) {
    clauses.push(`e.search_text LIKE ? ESCAPE '\\'`);
    params.push(`%${escapeLike(search)}%`);
  }
  if (filter.type) {
    clauses.push('e.type = ?');
    params.push(filter.type);
  }
  if (filter.accountId) {
    clauses.push('(e.account_id = ? OR e.destination_account_id = ?)');
    params.push(filter.accountId, filter.accountId);
  }
  if (filter.categoryId) {
    clauses.push('e.category_id = ?');
    params.push(filter.categoryId);
  }
  if (filter.from) {
    clauses.push('e.date >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    clauses.push('e.date <= ?');
    params.push(filter.to);
  }
  return { sql: clauses.join(' AND '), params };
}

async function loadValidationContext(
  tx: SqlExecutor,
): Promise<Omit<EntryValidationContext, 'previous'>> {
  const [accounts, categories] = [
    await tx.all<{ id: string; currency: string; archived_at: string | null }>(
      'SELECT id, currency, archived_at FROM accounts WHERE deleted_at IS NULL',
    ),
    await tx.all<{ id: string; type: Category['type'] }>(
      'SELECT id, type FROM categories WHERE deleted_at IS NULL',
    ),
  ];
  return {
    accounts: new Map(
      accounts.map((row) => [
        row.id,
        { id: row.id, currency: row.currency, archivedAt: row.archived_at },
      ]),
    ),
    categories: new Map(categories.map((row) => [row.id, row])),
  };
}

async function findActive(tx: SqlExecutor, id: Id): Promise<EntryRow | null> {
  return tx.first<EntryRow>(
    `SELECT ${COLUMNS} FROM entries e WHERE e.id = ? AND e.deleted_at IS NULL`,
    [id],
  );
}

async function prepare(
  tx: SqlExecutor,
  raw: EntryInput,
  previous?: EntryValidationContext['previous'],
): Promise<EntryInput> {
  const input = normalizeEntryInput(raw);
  const errors = validateEntryInput(input, { ...(await loadValidationContext(tx)), previous });
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

export function createSqliteEntryRepository(context: SqliteRepositoryContext): EntryRepository {
  const { db } = context;

  return {
    list(filter = {}) {
      const { sql, params } = buildWhere(filter);
      const direction = filter.sort === 'dateAsc' ? 'ASC' : 'DESC';
      const limit = Math.min(Math.max(filter.limit ?? 50, 1), MAX_PAGE_SIZE);
      const offset = Math.max(filter.offset ?? 0, 0);
      return db.transaction(async (tx) => {
        const rows = await tx.all<EntryRow>(
          `SELECT ${COLUMNS} FROM entries e WHERE ${sql}
           ORDER BY e.date ${direction}, e.created_at ${direction}, e.id ${direction}
           LIMIT ? OFFSET ?`,
          [...params, limit, offset],
        );
        const count = await tx.first<{ total: number }>(
          `SELECT COUNT(*) AS total FROM entries e WHERE ${sql}`,
          params,
        );
        return { items: rows.map(toEntry), total: count?.total ?? 0 };
      });
    },

    async get(id) {
      const row = await findActive(db, id);
      return row ? toEntry(row) : null;
    },

    create(raw) {
      return write(context, ['entries'], () =>
        db.transaction(async (tx) => {
          const input = await prepare(tx, raw);
          const timestamp = context.now();
          const entry: Entry = {
            ...input,
            id: context.newId(),
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          await tx.run(
            `INSERT INTO entries (id, type, amount, description, search_text, category_id, account_id,
               destination_account_id, date, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              entry.id,
              entry.type,
              entry.amount,
              entry.description,
              normalizeSearchText(entry.description),
              entry.categoryId,
              entry.accountId,
              entry.destinationAccountId,
              entry.date,
              entry.notes,
              timestamp,
              timestamp,
            ],
          );
          return entry;
        }),
      );
    },

    update(id, raw) {
      return write(context, ['entries'], () =>
        db.transaction(async (tx) => {
          const existing = await findActive(tx, id);
          if (!existing) throw new NotFoundError('entry', id);
          const input = await prepare(tx, raw, {
            accountId: existing.account_id,
            destinationAccountId: existing.destination_account_id,
          });
          const timestamp = context.now();
          await tx.run(
            `UPDATE entries SET type = ?, amount = ?, description = ?, search_text = ?, category_id = ?,
               account_id = ?, destination_account_id = ?, date = ?, notes = ?, updated_at = ?
             WHERE id = ?`,
            [
              input.type,
              input.amount,
              input.description,
              normalizeSearchText(input.description),
              input.categoryId,
              input.accountId,
              input.destinationAccountId,
              input.date,
              input.notes,
              timestamp,
              id,
            ],
          );
          return { ...toEntry(existing), ...input, updatedAt: timestamp };
        }),
      );
    },

    delete(id) {
      return write(context, ['entries'], async () => {
        const timestamp = context.now();
        const { changes } = await db.run(
          'UPDATE entries SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
          [timestamp, timestamp, id],
        );
        if (changes === 0) throw new NotFoundError('entry', id);
      });
    },

    async aggregate({ from, to }) {
      const rows = await db.all<{
        month: string;
        currency: string;
        type: 'income' | 'expense';
        category_id: string;
        amount: number;
      }>(
        `SELECT substr(e.date, 1, 7) AS month, a.currency AS currency, e.type AS type,
           e.category_id AS category_id, SUM(e.amount) AS amount
         FROM entries e
         JOIN accounts a ON a.id = e.account_id
         WHERE e.deleted_at IS NULL AND e.type IN ('income', 'expense')
           AND e.date >= ? AND e.date <= ?
         GROUP BY month, a.currency, e.type, e.category_id
         ORDER BY month`,
        [from, to],
      );
      return rows.map((row): EntryAggregate => ({
        month: row.month,
        currency: row.currency,
        type: row.type,
        categoryId: row.category_id,
        amount: row.amount,
      }));
    },
  };
}
