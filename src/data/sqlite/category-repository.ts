import {
  hasErrors,
  validateCategoryInput,
  ValidationError,
  type Category,
  type CategoryInput,
  type Id,
} from '@/core/finance';

import type { SqlExecutor } from '../db/sql-database';
import { CategoryInUseError, NotFoundError } from '../errors';
import type { CategoryRepository, CategoryWithUsage } from '../repositories/types';
import { write, type SqliteRepositoryContext } from './context';

type CategoryRow = {
  id: string;
  name: string;
  type: Category['type'];
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
};

const COLUMNS = 'c.id, c.name, c.type, c.icon, c.color, c.created_at, c.updated_at';
const ORDER = 'ORDER BY c.type, c.created_at, c.rowid';
const SEED_KEY = 'seed.defaultCategories';

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findActive(tx: SqlExecutor, id: Id): Promise<CategoryRow | null> {
  return tx.first<CategoryRow>(
    `SELECT ${COLUMNS} FROM categories c WHERE c.id = ? AND c.deleted_at IS NULL`,
    [id],
  );
}

async function countEntries(tx: SqlExecutor, id: Id): Promise<number> {
  const row = await tx.first<{ count: number }>(
    'SELECT COUNT(*) AS count FROM entries WHERE deleted_at IS NULL AND category_id = ?',
    [id],
  );
  return row?.count ?? 0;
}

function prepare(raw: CategoryInput): CategoryInput {
  const input = { ...raw, name: raw.name.trim() };
  const errors = validateCategoryInput(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

export function createSqliteCategoryRepository(
  context: SqliteRepositoryContext,
): CategoryRepository {
  const { db } = context;

  async function insert(tx: SqlExecutor, input: CategoryInput): Promise<Category> {
    const timestamp = context.now();
    const category: Category = {
      ...input,
      id: context.newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await tx.run(
      `INSERT INTO categories (id, name, type, icon, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        category.id,
        category.name,
        category.type,
        category.icon,
        category.color,
        timestamp,
        timestamp,
      ],
    );
    return category;
  }

  return {
    async list(type) {
      const rows = await db.all<CategoryRow>(
        `SELECT ${COLUMNS} FROM categories c WHERE c.deleted_at IS NULL
         ${type ? 'AND c.type = ?' : ''} ${ORDER}`,
        type ? [type] : [],
      );
      return rows.map(toCategory);
    },

    async listWithUsage(type) {
      const rows = await db.all<CategoryRow & { entry_count: number }>(
        `SELECT ${COLUMNS}, COUNT(e.id) AS entry_count
         FROM categories c
         LEFT JOIN entries e ON e.category_id = c.id AND e.deleted_at IS NULL
         WHERE c.deleted_at IS NULL ${type ? 'AND c.type = ?' : ''}
         GROUP BY c.id ${ORDER}`,
        type ? [type] : [],
      );
      return rows.map((row): CategoryWithUsage => ({
        ...toCategory(row),
        entryCount: row.entry_count,
      }));
    },

    async get(id) {
      const row = await findActive(db, id);
      return row ? toCategory(row) : null;
    },

    create(raw) {
      return write(context, ['categories'], () => insert(db, prepare(raw)));
    },

    update(id, raw) {
      return write(context, ['categories'], () =>
        db.transaction(async (tx) => {
          const existing = await findActive(tx, id);
          if (!existing) throw new NotFoundError('category', id);
          const input = prepare(raw);
          if (input.type !== existing.type && (await countEntries(tx, id)) > 0) {
            throw new ValidationError({ type: 'typeLocked' });
          }
          const timestamp = context.now();
          await tx.run(
            'UPDATE categories SET name = ?, type = ?, icon = ?, color = ?, updated_at = ? WHERE id = ?',
            [input.name, input.type, input.icon, input.color, timestamp, id],
          );
          return { ...toCategory(existing), ...input, updatedAt: timestamp };
        }),
      );
    },

    delete(id, { reassignTo } = {}) {
      return write(context, ['categories', 'entries', 'budgets'], () =>
        db.transaction(async (tx) => {
          const existing = await findActive(tx, id);
          if (!existing) throw new NotFoundError('category', id);
          const timestamp = context.now();
          const count = await countEntries(tx, id);
          let destination: Id | null = null;
          if (count > 0) {
            if (!reassignTo) throw new CategoryInUseError(count);
            destination = reassignTo;
            const target = reassignTo === id ? null : await findActive(tx, reassignTo);
            if (!target) throw new ValidationError({ categoryId: 'categoryNotFound' });
            if (target.type !== existing.type) {
              throw new ValidationError({ categoryId: 'categoryTypeMismatch' });
            }
          }
          // O orçamento sai primeiro e noutro grupo: o envio espera a confirmação
          // antes de apagar a categoria. A transação local continua atómica.
          const closed = await tx.run(
            `UPDATE budgets SET deleted_at = ?, updated_at = ?
             WHERE category_id = ? AND deleted_at IS NULL`,
            [timestamp, timestamp, id],
          );
          if (closed.changes > 0) {
            await tx.run(
              `UPDATE sync_state SET current_tx = lower(hex(randomblob(16))) WHERE id = 1`,
            );
          }
          if (destination) {
            await tx.run(
              `UPDATE entries SET category_id = ?, updated_at = ?
               WHERE category_id = ? AND deleted_at IS NULL`,
              [destination, timestamp, id],
            );
          }
          await tx.run('UPDATE categories SET deleted_at = ?, updated_at = ? WHERE id = ?', [
            timestamp,
            timestamp,
            id,
          ]);
        }),
      );
    },

    async seedDefaults(categories) {
      const seeded = await db.transaction(async (tx) => {
        const done = await tx.first<{ value: string }>('SELECT value FROM meta WHERE key = ?', [
          SEED_KEY,
        ]);
        if (done) return false;
        const timestamp = context.now();
        for (const { id, key, ...raw } of categories) {
          const { name, type, icon, color } = prepare(raw);
          // Identificador fixo: a mesma categoria base noutro dispositivo é a mesma linha.
          await tx.run(
            `INSERT OR IGNORE INTO categories
               (id, name, type, icon, color, system_key, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, type, icon, color, key, timestamp, timestamp],
          );
        }
        await tx.run('INSERT INTO meta (key, value) VALUES (?, ?)', [SEED_KEY, context.now()]);
        return true;
      });
      if (seeded) context.notify(['categories']);
      return seeded;
    },
  };
}
