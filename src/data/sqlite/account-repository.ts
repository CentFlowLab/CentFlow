import {
  balanceFromFlows,
  hasErrors,
  validateAccountInput,
  ValidationError,
  type Account,
  type AccountFlows,
  type AccountInput,
  type Id,
  toCalendarDate,
} from '@/core/finance';

import type { SqlExecutor } from '../db/sql-database';
import { AccountInUseError, NotFoundError } from '../errors';
import type { AccountRepository, AccountWithBalance } from '../repositories/types';
import { write, type SqliteRepositoryContext } from './context';

type AccountRow = {
  id: string;
  name: string;
  type: Account['type'];
  currency: string;
  initial_balance: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  credit_limit: number | null;
  institution: string | null;
  statement_day: number | null;
  due_day: number | null;
  payment_account_id: string | null;
  color: string | null;
};

type AccountFlowRow = AccountRow & {
  income: number;
  expense: number;
  transfer_out: number;
  transfer_in: number;
  entry_count: number;
};

const COLUMNS = `a.id, a.name, a.type, a.currency, a.initial_balance, a.created_at, a.updated_at,
  a.archived_at, a.credit_limit, a.institution, a.statement_day, a.due_day, a.payment_account_id,
  a.color`;

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    currency: row.currency,
    initialBalance: row.initial_balance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    creditLimit: row.credit_limit,
    institution: row.institution,
    statementDay: row.statement_day,
    dueDay: row.due_day,
    paymentAccountId: row.payment_account_id,
    color: row.color,
  };
}

type CardFields = Pick<
  Account,
  'creditLimit' | 'institution' | 'statementDay' | 'dueDay' | 'paymentAccountId' | 'color'
>;
const CARD_KEYS = [
  'creditLimit',
  'institution',
  'statementDay',
  'dueDay',
  'paymentAccountId',
  'color',
] as const;

/**
 * Campos do cartão: ausentes no `raw` (ecrãs antigos) mantêm o valor guardado; numa conta que
 * deixa de ser cartão, ficam vazios.
 */
function cardFields(raw: AccountInput, existing?: Account): CardFields {
  const fields = {} as Record<keyof CardFields, unknown>;
  for (const key of CARD_KEYS) {
    const value = raw[key];
    fields[key] = value === undefined ? (existing?.[key] ?? null) : value;
  }
  const institution = typeof fields.institution === 'string' ? fields.institution.trim() : null;
  fields.institution = institution === '' ? null : institution;
  if (raw.type !== 'card') {
    for (const key of ['creditLimit', 'statementDay', 'dueDay', 'paymentAccountId'] as const) {
      fields[key] = null;
    }
  }
  return fields as CardFields;
}

/** A conta que paga o cartão: outra conta ativa, que não seja cartão, na mesma moeda. */
async function checkPaymentAccount(
  tx: SqlExecutor,
  input: AccountInput & CardFields,
  selfId: string | null,
): Promise<void> {
  if (!input.paymentAccountId) return;
  const target = await findActive(tx, input.paymentAccountId);
  if (
    !target ||
    target.id === selfId ||
    target.type === 'card' ||
    target.currency !== input.currency.toUpperCase()
  ) {
    throw new ValidationError({ paymentAccountId: 'invalid' });
  }
}

function toFlows(row: AccountFlowRow): AccountFlows {
  return {
    income: row.income,
    expense: row.expense,
    transferOut: row.transfer_out,
    transferIn: row.transfer_in,
  };
}

/** Totais por conta; cada movimento entra uma vez por conta envolvida. */
const FLOWS_QUERY = `
  SELECT ${COLUMNS},
    COALESCE(SUM(CASE WHEN e.type = 'income' THEN e.amount END), 0) AS income,
    COALESCE(SUM(CASE WHEN e.type = 'expense' THEN e.amount END), 0) AS expense,
    COALESCE(SUM(CASE WHEN e.type = 'transfer' AND e.account_id = a.id THEN e.amount END), 0) AS transfer_out,
    COALESCE(SUM(CASE WHEN e.type = 'transfer' AND e.destination_account_id = a.id THEN e.amount END), 0) AS transfer_in,
    COUNT(e.id) AS entry_count
  FROM accounts a
  LEFT JOIN entries e
    ON e.deleted_at IS NULL AND (e.account_id = a.id OR e.destination_account_id = a.id)
  WHERE a.deleted_at IS NULL`;

const ORDER = 'ORDER BY (a.archived_at IS NOT NULL), a.created_at, a.rowid';

async function findActive(tx: SqlExecutor, id: Id): Promise<AccountRow | null> {
  return tx.first<AccountRow>(
    `SELECT ${COLUMNS} FROM accounts a WHERE a.id = ? AND a.deleted_at IS NULL`,
    [id],
  );
}

async function countEntries(tx: SqlExecutor, id: Id): Promise<number> {
  const row = await tx.first<{ count: number }>(
    `SELECT COUNT(*) AS count FROM entries
     WHERE deleted_at IS NULL AND (account_id = ? OR destination_account_id = ?)`,
    [id, id],
  );
  return row?.count ?? 0;
}

function assertValid(input: AccountInput): void {
  const errors = validateAccountInput(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
}

function normalize(input: AccountInput): AccountInput {
  return { ...input, name: input.name.trim(), currency: input.currency.toUpperCase() };
}

/** Valida e grava uma conta nova (também usado ao passar um cartão do património para Contas). */
export async function insertAccount(
  tx: SqlExecutor,
  context: Pick<SqliteRepositoryContext, 'newId' | 'now'>,
  rawInput: AccountInput,
): Promise<Account> {
  const input = { ...normalize(rawInput), ...cardFields(rawInput) };
  assertValid(input);
  await checkPaymentAccount(tx, input, null);
  const timestamp = context.now();
  const account: Account = {
    ...input,
    id: context.newId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null,
  };
  await tx.run(
    `INSERT INTO accounts (id, name, type, currency, initial_balance, credit_limit, institution,
       statement_day, due_day, payment_account_id, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      account.id,
      account.name,
      account.type,
      account.currency,
      account.initialBalance,
      account.creditLimit,
      account.institution,
      account.statementDay,
      account.dueDay,
      account.paymentAccountId,
      account.color,
      timestamp,
      timestamp,
    ],
  );
  return account;
}

export function createSqliteAccountRepository(context: SqliteRepositoryContext): AccountRepository {
  const { db } = context;

  return {
    async list({ includeArchived = false } = {}) {
      const rows = await db.all<AccountRow>(
        `SELECT ${COLUMNS} FROM accounts a WHERE a.deleted_at IS NULL
         ${includeArchived ? '' : 'AND a.archived_at IS NULL'} ${ORDER}`,
      );
      return rows.map(toAccount);
    },

    async listWithBalances({ includeArchived = false } = {}) {
      const rows = await db.all<AccountFlowRow>(
        `${FLOWS_QUERY} ${includeArchived ? '' : 'AND a.archived_at IS NULL'} GROUP BY a.id ${ORDER}`,
      );
      return rows.map((row): AccountWithBalance => ({
        ...toAccount(row),
        balance: balanceFromFlows(row.initial_balance, toFlows(row)),
        entryCount: row.entry_count,
      }));
    },

    async get(id) {
      const row = await findActive(db, id);
      return row ? toAccount(row) : null;
    },

    create(rawInput) {
      return write(context, ['accounts'], () =>
        db.transaction((tx) => insertAccount(tx, context, rawInput)),
      );
    },

    update(id, rawInput) {
      return write(context, ['accounts'], () =>
        db.transaction(async (tx) => {
          const existing = await findActive(tx, id);
          if (!existing) throw new NotFoundError('account', id);
          const input = { ...normalize(rawInput), ...cardFields(rawInput, toAccount(existing)) };
          assertValid(input);
          await checkPaymentAccount(tx, input, id);
          if (input.currency !== existing.currency && (await countEntries(tx, id)) > 0) {
            throw new ValidationError({ currency: 'currencyLocked' });
          }
          const timestamp = context.now();
          await tx.run(
            `UPDATE accounts SET name = ?, type = ?, currency = ?, initial_balance = ?,
               credit_limit = ?, institution = ?, statement_day = ?, due_day = ?,
               payment_account_id = ?, color = ?, updated_at = ?
             WHERE id = ?`,
            [
              input.name,
              input.type,
              input.currency,
              input.initialBalance,
              input.creditLimit,
              input.institution,
              input.statementDay,
              input.dueDay,
              input.paymentAccountId,
              input.color,
              timestamp,
              id,
            ],
          );
          return { ...toAccount(existing), ...input, updatedAt: timestamp };
        }),
      );
    },

    setArchived(id, archived) {
      return write(context, ['accounts'], async () => {
        const timestamp = context.now();
        const { changes } = await db.run(
          `UPDATE accounts SET archived_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
          [archived ? timestamp : null, timestamp, id],
        );
        if (changes === 0) throw new NotFoundError('account', id);
      });
    },

    delete(id) {
      return write(context, ['accounts'], () =>
        db.transaction(async (tx) => {
          if (!(await findActive(tx, id))) throw new NotFoundError('account', id);
          const count = await countEntries(tx, id);
          if (count > 0) throw new AccountInUseError(count);
          const timestamp = context.now();
          await tx.run(`UPDATE accounts SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
            timestamp,
            timestamp,
            id,
          ]);
        }),
      );
    },

    deleteWithEntries(id) {
      return write(context, ['accounts', 'entries'], () =>
        db.transaction(async (tx) => {
          if (!(await findActive(tx, id))) throw new NotFoundError('account', id);
          const timestamp = context.now();
          const { changes } = await tx.run(
            `UPDATE entries SET deleted_at = ?, updated_at = ?
             WHERE deleted_at IS NULL AND (account_id = ? OR destination_account_id = ?)`,
            [timestamp, timestamp, id, id],
          );
          await tx.run(`UPDATE accounts SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
            timestamp,
            timestamp,
            id,
          ]);
          return changes;
        }),
      );
    },

    async getFlows() {
      const rows = await db.all<AccountFlowRow>(`${FLOWS_QUERY} GROUP BY a.id`);
      return new Map(rows.map((row) => [row.id, toFlows(row)]));
    },

    async balanceHistory() {
      return db.transaction(async (tx) => {
        const accounts = await tx.all<{
          id: string;
          type: Account['type'];
          currency: string;
          initial_balance: number;
          created_at: string;
          first_entry: string | null;
        }>(
          `SELECT a.id, a.type, a.currency, a.initial_balance, a.created_at,
                  (SELECT MIN(e.date) FROM entries e
                    WHERE e.deleted_at IS NULL
                      AND (e.account_id = a.id OR e.destination_account_id = a.id)) AS first_entry
             FROM accounts a WHERE a.deleted_at IS NULL`,
        );
        // Despesa sai da conta; rendimento entra; transferência sai da origem e entra no destino.
        const flows = await tx.all<{ account_id: string; month: string; net: number }>(
          `SELECT account_id, month, SUM(delta) AS net FROM (
             SELECT account_id, substr(date, 1, 7) AS month,
                    CASE type WHEN 'income' THEN amount ELSE -amount END AS delta
               FROM entries WHERE deleted_at IS NULL
             UNION ALL
             SELECT destination_account_id, substr(date, 1, 7), amount
               FROM entries WHERE deleted_at IS NULL AND type = 'transfer'
           ) GROUP BY account_id, month`,
        );
        return {
          accounts: accounts.map((row) => {
            const created = toCalendarDate(new Date(row.created_at));
            return {
              id: row.id,
              type: row.type,
              currency: row.currency,
              initialBalance: row.initial_balance,
              since: row.first_entry && row.first_entry < created ? row.first_entry : created,
            };
          }),
          flows: flows.map((row) => ({
            accountId: row.account_id,
            month: row.month,
            net: row.net,
          })),
        };
      });
    },
  };
}
