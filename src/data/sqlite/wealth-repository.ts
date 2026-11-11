import {
  hasErrors,
  isValidCalendarDate,
  recordValuation,
  validateWealthItemInput,
  validateWealthPayment,
  ValidationError,
  withOrigin,
  type WealthItem,
  type WealthItemInput,
  type WealthValuation,
} from '@/core/finance';

import type { SqlExecutor } from '../db/sql-database';
import { NotFoundError } from '../errors';
import type { WealthRepository } from '../repositories/types';
import { insertAccount } from './account-repository';
import { write, type SqliteRepositoryContext } from './context';
import { insertEntry, prepareEntry } from './entry-repository';

type WealthRow = {
  id: string;
  name: string;
  type: WealthItem['type'];
  amount: number;
  currency: string;
  valued_on: string;
  value_history: string | null;
  closed_on: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = `id, name, type, amount, currency, valued_on, value_history, closed_on, created_at,
  updated_at`;

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
    closedOn: row.closed_on,
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
    ...(raw.origin ? { origin: { amount: raw.origin.amount, valuedOn: raw.origin.valuedOn } } : {}),
  };
  const errors = validateWealthItemInput(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

async function findOpen(tx: SqlExecutor, id: string): Promise<WealthRow> {
  const row = await tx.first<WealthRow>(
    `SELECT ${COLUMNS} FROM wealth_items WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  if (!row) throw new NotFoundError('wealth_item', id);
  return row;
}

/** Campos guardados; a origem só existe no histórico. */
function stored({ origin: _origin, ...input }: WealthItemInput) {
  return input;
}

export function createSqliteWealthRepository(context: SqliteRepositoryContext): WealthRepository {
  const { db } = context;

  function setClosed(id: string, closedOn: string | null): Promise<WealthItem> {
    if (closedOn !== null && !isValidCalendarDate(closedOn)) {
      return Promise.reject(new ValidationError({ closedOn: 'invalidDate' }));
    }
    return write(context, ['wealth_items'], () =>
      db.transaction(async (tx) => {
        const existing = await tx.first<WealthRow>(
          `SELECT ${COLUMNS} FROM wealth_items WHERE id = ? AND deleted_at IS NULL`,
          [id],
        );
        if (!existing) throw new NotFoundError('wealth_item', id);
        const timestamp = context.now();
        await tx.run('UPDATE wealth_items SET closed_on = ?, updated_at = ? WHERE id = ?', [
          closedOn,
          timestamp,
          id,
        ]);
        return { ...toItem(existing), closedOn, updatedAt: timestamp };
      }),
    );
  }

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
          const valueHistory = withOrigin([], input.origin);
          await tx.run(
            `INSERT INTO wealth_items (id, name, type, amount, currency, valued_on, value_history,
               created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              input.name,
              input.type,
              input.amount,
              input.currency,
              input.valuedOn,
              serializeHistory(valueHistory),
              timestamp,
              timestamp,
            ],
          );
          return {
            id,
            ...stored(input),
            valueHistory,
            closedOn: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
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
          const valueHistory = withOrigin(recordValuation(before, input), input.origin);
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
          return { ...before, ...stored(input), valueHistory, updatedAt: timestamp };
        }),
      );
    },

    close(id, closedOn) {
      return setClosed(id, closedOn);
    },

    reopen(id) {
      return setClosed(id, null);
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

    recordPayment(id, payment) {
      return write(context, ['entries', 'wealth_items'], () =>
        db.transaction(async (tx) => {
          const before = toItem(await findOpen(tx, id));
          const errors = validateWealthPayment(payment, before);
          if (hasErrors(errors)) throw new ValidationError(errors);
          const entryInput = await prepareEntry(tx, {
            type: 'expense',
            amount: payment.amount,
            description: payment.description,
            categoryId: payment.categoryId,
            accountId: payment.accountId,
            destinationAccountId: null,
            date: payment.date,
            notes: null,
          });
          const account = await tx.first<{ currency: string }>(
            'SELECT currency FROM accounts WHERE id = ?',
            [entryInput.accountId],
          );
          if (account?.currency !== before.currency) {
            throw new ValidationError({ accountId: 'currencyMismatch' });
          }
          const entry = await insertEntry(tx, context, entryInput);
          const remaining = before.amount - payment.principal;
          // Paga por inteiro: o valor não pode ser 0 (restrição da tabela); fica o último em dívida
          // e a dívida sai do património nesse dia, como "Pago".
          const closedOn = remaining === 0 ? payment.date : null;
          const next = closedOn
            ? { amount: before.amount, currency: before.currency, valuedOn: before.valuedOn }
            : { amount: remaining, currency: before.currency, valuedOn: payment.date };
          const valueHistory = recordValuation(before, next);
          const timestamp = context.now();
          await tx.run(
            `UPDATE wealth_items SET amount = ?, valued_on = ?, value_history = ?, closed_on = ?,
               updated_at = ? WHERE id = ?`,
            [next.amount, next.valuedOn, serializeHistory(valueHistory), closedOn, timestamp, id],
          );
          return {
            entry,
            item: { ...before, ...next, valueHistory, closedOn, updatedAt: timestamp },
          };
        }),
      );
    },

    moveCardToAccounts(id, today) {
      return write(context, ['accounts', 'wealth_items'], () =>
        db.transaction(async (tx) => {
          const item = toItem(await findOpen(tx, id));
          if (item.type !== 'credit' || item.closedOn) {
            throw new ValidationError({ type: 'notLiability' });
          }
          const account = await insertAccount(tx, context, {
            name: item.name,
            type: 'card',
            currency: item.currency,
            initialBalance: -item.amount,
          });
          await tx.run('UPDATE wealth_items SET closed_on = ?, updated_at = ? WHERE id = ?', [
            today,
            context.now(),
            id,
          ]);
          return account;
        }),
      );
    },
  };
}
