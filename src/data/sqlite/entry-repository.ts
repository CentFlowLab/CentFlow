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
  validateOdometerReading,
  type VehicleCostType,
} from '@/core/finance';
import { normalizeSearchText } from '@/core/text/search';

import type { SqlExecutor, SqlValue } from '../db/sql-database';
import { NotFoundError } from '../errors';
import type { EntryAggregate, EntryFilter, EntryRepository } from '../repositories/types';
import { write, type SqliteRepositoryContext } from './context';
import { recomputeLoan } from './loan-ledger';

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
  vehicle_id: string | null;
  vehicle_cost_type: VehicleCostType | null;
  quantity_milli: number | null;
  odometer_km: number | null;
  loan_id: string | null;
  loan_role: Entry['loanRole'];
  principal_amount: number | null;
  interest_amount: number | null;
  fees_amount: number | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = `e.id, e.type, e.amount, e.description, e.category_id, e.account_id,
  e.destination_account_id, e.date, e.notes, e.vehicle_id, e.vehicle_cost_type, e.quantity_milli,
  e.odometer_km, e.loan_id, e.loan_role, e.principal_amount, e.interest_amount, e.fees_amount,
  e.created_at, e.updated_at`;

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
    vehicleId: row.vehicle_id,
    vehicleCostType: row.vehicle_cost_type,
    quantityMilli: row.quantity_milli,
    odometerKm: row.odometer_km,
    loanId: row.loan_id,
    loanRole: row.loan_role,
    principalAmount: row.principal_amount,
    interestAmount: row.interest_amount,
    feesAmount: row.fees_amount,
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
  if (filter.vehicleId) {
    clauses.push('e.vehicle_id = ?');
    params.push(filter.vehicleId);
  }
  if (filter.withoutVehicle) {
    clauses.push("e.vehicle_id IS NULL AND e.type <> 'transfer'");
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
  const [accounts, categories, vehicles, loans] = [
    await tx.all<{ id: string; currency: string; archived_at: string | null }>(
      'SELECT id, currency, archived_at FROM accounts WHERE deleted_at IS NULL',
    ),
    await tx.all<{ id: string; type: Category['type'] }>(
      'SELECT id, type FROM categories WHERE deleted_at IS NULL',
    ),
    await tx.all<{ id: string }>('SELECT id FROM vehicles WHERE deleted_at IS NULL'),
    await tx.all<{ id: string }>(
      `SELECT id FROM wealth_items WHERE deleted_at IS NULL
         AND type IN ('mortgage', 'loan', 'other_debt')`,
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
    vehicles: new Set(vehicles.map((row) => row.id)),
    loans: new Set(loans.map((row) => row.id)),
  };
}

/**
 * Regras que precisam dos outros movimentos do veículo (ADR-054): uma só compra marcada por
 * veículo e leituras de quilómetros por ordem de data.
 */
async function checkVehicleRules(
  tx: SqlExecutor,
  input: EntryInput,
  excludeId: Id | null,
): Promise<void> {
  if (!input.vehicleId) return;
  if (input.vehicleCostType === 'purchase') {
    const other = await tx.first<{ id: string }>(
      `SELECT id FROM entries WHERE vehicle_id = ? AND vehicle_cost_type = 'purchase'
         AND deleted_at IS NULL AND id IS NOT ?`,
      [input.vehicleId, excludeId],
    );
    if (other) throw new ValidationError({ vehicleCostType: 'purchaseAlreadyLinked' });
  }
  if (input.odometerKm != null) {
    const readings = await tx.all<{ date: string; odometer_km: number }>(
      `SELECT date, odometer_km FROM entries WHERE vehicle_id = ? AND odometer_km IS NOT NULL
         AND deleted_at IS NULL AND id IS NOT ?`,
      [input.vehicleId, excludeId],
    );
    const code = validateOdometerReading(
      { date: input.date, odometerKm: input.odometerKm },
      readings.map((row) => ({ date: row.date, odometerKm: row.odometer_km })),
    );
    if (code) throw new ValidationError({ odometerKm: code });
  }
}

async function findActive(tx: SqlExecutor, id: Id): Promise<EntryRow | null> {
  return tx.first<EntryRow>(
    `SELECT ${COLUMNS} FROM entries e WHERE e.id = ? AND e.deleted_at IS NULL`,
    [id],
  );
}

/** Normaliza e valida um movimento dentro da transação. */
export async function prepareEntry(
  tx: SqlExecutor,
  raw: EntryInput,
  previous?: EntryValidationContext['previous'],
  excludeId: Id | null = null,
): Promise<EntryInput> {
  const input = normalizeEntryInput(raw);
  const errors = validateEntryInput(input, { ...(await loadValidationContext(tx)), previous });
  if (hasErrors(errors)) throw new ValidationError(errors);
  await checkVehicleRules(tx, input, excludeId);
  return input;
}

/** Ao editar sem dizer nada sobre o veículo (ex.: ecrãs antigos), mantém a ligação que existia. */
function keepVehicle(raw: EntryInput, existing: EntryRow): EntryInput {
  if (raw.vehicleId !== undefined) return raw;
  return {
    ...raw,
    vehicleId: existing.vehicle_id,
    vehicleCostType: existing.vehicle_cost_type,
    quantityMilli: existing.quantity_milli,
    odometerKm: existing.odometer_km,
  };
}

/**
 * Ao editar sem dizer nada sobre o empréstimo, mantém a ligação (ADR-057). Se o valor de uma
 * prestação mudou, o capital e os juros mantêm-se até caberem e o resto fica em encargos.
 */
function keepLoan(raw: EntryInput, existing: EntryRow): EntryInput {
  if (raw.loanId !== undefined || existing.loan_id === null) return raw;
  if (existing.loan_role !== 'payment') {
    return { ...raw, loanId: existing.loan_id, loanRole: existing.loan_role };
  }
  const principal = Math.min(existing.principal_amount ?? 0, raw.amount);
  const interest = Math.min(existing.interest_amount ?? 0, raw.amount - principal);
  return {
    ...raw,
    loanId: existing.loan_id,
    loanRole: existing.loan_role,
    principalAmount: principal,
    interestAmount: interest,
    feesAmount: raw.amount - principal - interest,
  };
}

/** Grava um movimento já validado (também usado pelos pagamentos de dívidas). */
export async function insertEntry(
  tx: SqlExecutor,
  context: Pick<SqliteRepositoryContext, 'newId' | 'now'>,
  input: EntryInput,
): Promise<Entry> {
  const timestamp = context.now();
  const entry: Entry = {
    ...input,
    vehicleId: input.vehicleId ?? null,
    vehicleCostType: input.vehicleCostType ?? null,
    quantityMilli: input.quantityMilli ?? null,
    odometerKm: input.odometerKm ?? null,
    loanId: input.loanId ?? null,
    loanRole: input.loanRole ?? null,
    principalAmount: input.principalAmount ?? null,
    interestAmount: input.interestAmount ?? null,
    feesAmount: input.feesAmount ?? null,
    id: context.newId(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await tx.run(
    `INSERT INTO entries (id, type, amount, description, search_text, category_id, account_id,
       destination_account_id, date, notes, vehicle_id, vehicle_cost_type, quantity_milli,
       odometer_km, loan_id, loan_role, principal_amount, interest_amount, fees_amount, created_at,
       updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      entry.vehicleId,
      entry.vehicleCostType,
      entry.quantityMilli,
      entry.odometerKm,
      entry.loanId,
      entry.loanRole,
      entry.principalAmount,
      entry.interestAmount,
      entry.feesAmount,
      timestamp,
      timestamp,
    ],
  );
  return entry;
}

/**
 * Valor que conta nos relatórios de despesas e rendimentos. Numa prestação de empréstimo só o
 * custo financeiro (juros + encargos) é despesa: o capital amortizado reduz a dívida e não é
 * consumo. O saldo da conta continua a descontar o pagamento inteiro (saída de dinheiro).
 */
const REPORTED_AMOUNT = `CASE WHEN e.loan_role = 'payment'
  THEN e.amount - COALESCE(e.principal_amount, 0) ELSE e.amount END`;

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

    async create(raw) {
      const created = await write(context, ['entries'], () =>
        db.transaction(async (tx) => {
          const entry = await insertEntry(tx, context, await prepareEntry(tx, raw));
          // Prestação ou desembolso de um empréstimo: a dívida recalcula-se (ADR-057).
          await recomputeLoan(tx, context, entry.loanId);
          return entry;
        }),
      );
      if (created.loanId) context.notify(['wealth_items']);
      return created;
    },

    createMany(raws) {
      return write(context, ['entries'], () =>
        db.transaction(async (tx) => {
          const created: Entry[] = [];
          for (const [index, raw] of raws.entries()) {
            let input: EntryInput;
            try {
              input = await prepareEntry(tx, raw);
            } catch (error) {
              if (error instanceof ValidationError) throw new ValidationError(error.errors, index);
              throw error;
            }
            created.push(await insertEntry(tx, context, input));
          }
          return created;
        }),
      );
    },

    async update(id, raw) {
      let loanChanged = false;
      const updated = await write(context, ['entries'], () =>
        db.transaction(async (tx) => {
          const existing = await findActive(tx, id);
          if (!existing) throw new NotFoundError('entry', id);
          const input = await prepareEntry(
            tx,
            keepLoan(keepVehicle(raw, existing), existing),
            {
              accountId: existing.account_id,
              destinationAccountId: existing.destination_account_id,
            },
            id,
          );
          const timestamp = context.now();
          await tx.run(
            `UPDATE entries SET type = ?, amount = ?, description = ?, search_text = ?, category_id = ?,
               account_id = ?, destination_account_id = ?, date = ?, notes = ?, vehicle_id = ?,
               vehicle_cost_type = ?, quantity_milli = ?, odometer_km = ?, loan_id = ?, loan_role = ?,
               principal_amount = ?, interest_amount = ?, fees_amount = ?, updated_at = ?
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
              input.vehicleId ?? null,
              input.vehicleCostType ?? null,
              input.quantityMilli ?? null,
              input.odometerKm ?? null,
              input.loanId ?? null,
              input.loanRole ?? null,
              input.principalAmount ?? null,
              input.interestAmount ?? null,
              input.feesAmount ?? null,
              timestamp,
              id,
            ],
          );
          // Prestação editada (ou movida de empréstimo): a dívida recalcula-se (ADR-057).
          await recomputeLoan(tx, context, existing.loan_id);
          if (input.loanId && input.loanId !== existing.loan_id) {
            await recomputeLoan(tx, context, input.loanId);
          }
          loanChanged = existing.loan_id !== null || Boolean(input.loanId);
          return {
            ...toEntry(existing),
            ...input,
            vehicleId: input.vehicleId ?? null,
            vehicleCostType: input.vehicleCostType ?? null,
            quantityMilli: input.quantityMilli ?? null,
            odometerKm: input.odometerKm ?? null,
            loanId: input.loanId ?? null,
            loanRole: input.loanRole ?? null,
            principalAmount: input.principalAmount ?? null,
            interestAmount: input.interestAmount ?? null,
            feesAmount: input.feesAmount ?? null,
            updatedAt: timestamp,
          };
        }),
      );
      if (loanChanged) context.notify(['wealth_items']);
      return updated;
    },

    linkVehicle(ids, link) {
      return write(context, ['entries'], () =>
        db.transaction(async (tx) => {
          if (link.vehicleCostType === 'purchase' && ids.length > 1) {
            throw new ValidationError({ vehicleCostType: 'purchaseAlreadyLinked' });
          }
          const timestamp = context.now();
          for (const id of ids) {
            const existing = await findActive(tx, id);
            if (!existing) throw new NotFoundError('entry', id);
            // Só muda a ligação: valor, categoria, conta e data ficam como estão.
            const input = await prepareEntry(
              tx,
              {
                ...toEntry(existing),
                vehicleId: link.vehicleId,
                vehicleCostType: link.vehicleCostType,
                quantityMilli: null,
                odometerKm: null,
              },
              {
                accountId: existing.account_id,
                destinationAccountId: existing.destination_account_id,
              },
              id,
            );
            await tx.run(
              `UPDATE entries SET vehicle_id = ?, vehicle_cost_type = ?, quantity_milli = NULL,
                 odometer_km = NULL, updated_at = ? WHERE id = ?`,
              [input.vehicleId ?? null, input.vehicleCostType ?? null, timestamp, id],
            );
          }
        }),
      );
    },

    async listForVehicle(vehicleId) {
      const rows = await db.all<EntryRow & { currency: string }>(
        `SELECT ${COLUMNS}, a.currency AS currency FROM entries e
           JOIN accounts a ON a.id = e.account_id
          WHERE e.vehicle_id = ? AND e.deleted_at IS NULL
          ORDER BY e.date DESC, e.created_at DESC`,
        [vehicleId],
      );
      return rows.map((row) => ({ ...toEntry(row), currency: row.currency }));
    },

    async delete(id) {
      let loanChanged = false;
      await write(context, ['entries'], () =>
        db.transaction(async (tx) => {
          const existing = await findActive(tx, id);
          if (!existing) throw new NotFoundError('entry', id);
          const timestamp = context.now();
          await tx.run(
            'UPDATE entries SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
            [timestamp, timestamp, id],
          );
          // Prestação eliminada: a dívida volta a subir (ADR-057).
          await recomputeLoan(tx, context, existing.loan_id);
          loanChanged = existing.loan_id !== null;
        }),
      );
      if (loanChanged) context.notify(['wealth_items']);
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
           e.category_id AS category_id, SUM(${REPORTED_AMOUNT}) AS amount
         FROM entries e
         JOIN accounts a ON a.id = e.account_id
         WHERE e.deleted_at IS NULL AND e.type IN ('income', 'expense')
           AND (e.loan_role IS NULL OR e.loan_role <> 'disbursement')
           AND e.date >= ? AND e.date <= ?
         GROUP BY month, a.currency, e.type, e.category_id
         HAVING SUM(${REPORTED_AMOUNT}) > 0
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

    async aggregateByDate({ from, to }) {
      const rows = await db.all<{
        date: string;
        currency: string;
        type: 'income' | 'expense';
        category_id: string | null;
        amount: number;
      }>(
        `SELECT e.date AS date, a.currency AS currency, e.type AS type,
           e.category_id AS category_id, SUM(${REPORTED_AMOUNT}) AS amount
         FROM entries e
         JOIN accounts a ON a.id = e.account_id
         WHERE e.deleted_at IS NULL AND e.type IN ('income', 'expense')
           AND (e.loan_role IS NULL OR e.loan_role <> 'disbursement')
           AND e.date >= ? AND e.date <= ?
         GROUP BY e.date, a.currency, e.type, e.category_id
         HAVING SUM(${REPORTED_AMOUNT}) > 0
         ORDER BY e.date`,
        [from, to],
      );
      return rows.map((row) => ({
        date: row.date,
        currency: row.currency,
        type: row.type,
        categoryId: row.category_id,
        amount: Number(row.amount),
      }));
    },

    async listExpenses({ from, to }) {
      const rows = await db.all<{
        category_id: string;
        currency: string;
        date: string;
        amount: number;
      }>(
        `SELECT e.category_id AS category_id, a.currency AS currency, e.date AS date,
           ${REPORTED_AMOUNT} AS amount
         FROM entries e
         JOIN accounts a ON a.id = e.account_id
         WHERE e.deleted_at IS NULL AND a.deleted_at IS NULL AND e.type = 'expense'
           AND e.category_id IS NOT NULL AND e.date >= ? AND e.date <= ?
           AND ${REPORTED_AMOUNT} > 0`,
        [from, to],
      );
      return rows.map((row) => ({
        type: 'expense' as const,
        categoryId: row.category_id,
        currency: row.currency,
        date: row.date,
        amount: row.amount,
      }));
    },

    async history({ since, limit = 2000 }) {
      const rows = await db.all<{
        id: string;
        type: Entry['type'];
        description: string;
        category_id: string | null;
        account_id: string;
        amount: number;
        date: string;
      }>(
        `SELECT e.id, e.type, e.description, e.category_id, e.account_id, e.amount, e.date
           FROM entries e
          WHERE e.deleted_at IS NULL AND e.date >= ? AND e.loan_id IS NULL
          ORDER BY e.date DESC, e.rowid DESC
          LIMIT ?`,
        [since, limit],
      );
      return rows.map((row) => ({
        id: row.id,
        type: row.type,
        description: row.description,
        categoryId: row.category_id,
        accountId: row.account_id,
        amount: row.amount,
        date: row.date,
      }));
    },

    async findSimilar({ type, amount, accountId, date }) {
      const row = await db.first<{ id: string }>(
        `SELECT id FROM entries
          WHERE deleted_at IS NULL AND type = ? AND amount = ? AND account_id = ? AND date = ?
          LIMIT 1`,
        [type, amount, accountId, date],
      );
      return row?.id ?? null;
    },
  };
}
