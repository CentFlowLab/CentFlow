import {
  hasErrors,
  validateGoalContributionInput,
  validateSavingsGoalInput,
  ValidationError,
  type GoalContribution,
  type GoalContributionInput,
  type SavingsGoal,
  type SavingsGoalInput,
} from '@/core/finance';

import type { SqlExecutor } from '../db/sql-database';
import { NotFoundError } from '../errors';
import type { LinkableTransfer, SavingsGoalRepository } from '../repositories/types';
import { write, type SqliteRepositoryContext } from './context';

type GoalRow = {
  id: string;
  name: string;
  target_amount: number;
  currency: string;
  target_on: string | null;
  icon: string | null;
  color: string | null;
  description: string | null;
  account_id: string | null;
  created_at: string;
  updated_at: string;
};

type ContributionRow = {
  id: string;
  goal_id: string;
  amount: number;
  date: string;
  entry_id: string | null;
  created_at: string;
  updated_at: string;
};

// Uma conta ou um movimento eliminado deixa de aparecer ligado (a coluna fica, a ligação não).
const GOAL_COLUMNS = `g.id, g.name, g.target_amount, g.currency, g.target_on, g.icon, g.color,
  g.description,
  CASE WHEN EXISTS (SELECT 1 FROM accounts a WHERE a.id = g.account_id AND a.deleted_at IS NULL)
    THEN g.account_id END AS account_id,
  g.created_at, g.updated_at`;
const CONTRIBUTION_COLUMNS = `c.id, c.goal_id, c.amount, c.date,
  CASE WHEN EXISTS (SELECT 1 FROM entries e WHERE e.id = c.entry_id AND e.deleted_at IS NULL)
    THEN c.entry_id END AS entry_id,
  c.created_at, c.updated_at`;

function toGoal(row: GoalRow): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    currency: row.currency,
    targetOn: row.target_on,
    icon: row.icon,
    color: row.color,
    description: row.description,
    accountId: row.account_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toContribution(row: ContributionRow): GoalContribution {
  return {
    id: row.id,
    goalId: row.goal_id,
    amount: row.amount,
    date: row.date,
    entryId: row.entry_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type PreparedGoal = Required<SavingsGoalInput>;

/** Campos omitidos (ecrãs antigos) mantêm o valor guardado. */
function prepareGoal(raw: SavingsGoalInput, existing?: SavingsGoal): PreparedGoal {
  const targetOn = raw.targetOn?.trim() ?? '';
  const text = (value: string | null | undefined, fallback: string | null) => {
    if (value === undefined) return fallback;
    const trimmed = value?.trim() ?? '';
    return trimmed === '' ? null : trimmed;
  };
  const input: PreparedGoal = {
    name: raw.name.trim(),
    targetAmount: raw.targetAmount,
    currency: raw.currency.trim().toUpperCase(),
    targetOn: targetOn === '' ? null : targetOn,
    icon: text(raw.icon, existing?.icon ?? null),
    color: text(raw.color, existing?.color ?? null),
    description: text(raw.description, existing?.description ?? null),
    accountId: raw.accountId === undefined ? (existing?.accountId ?? null) : raw.accountId,
  };
  const errors = validateSavingsGoalInput(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

/** A conta associada tem de existir, estar ativa e usar a moeda do objetivo. */
async function checkGoalAccount(tx: SqlExecutor, input: PreparedGoal) {
  if (input.accountId === null) return;
  const account = await tx.first<{ currency: string; archived_at: string | null }>(
    'SELECT currency, archived_at FROM accounts WHERE id = ? AND deleted_at IS NULL',
    [input.accountId],
  );
  if (!account) throw new ValidationError({ accountId: 'accountNotFound' });
  if (account.archived_at !== null) throw new ValidationError({ accountId: 'accountArchived' });
  if (account.currency !== input.currency) {
    throw new ValidationError({ accountId: 'currencyMismatch' });
  }
}

function prepareContribution(raw: GoalContributionInput): Required<GoalContributionInput> {
  const input = {
    goalId: raw.goalId.trim(),
    amount: raw.amount,
    date: raw.date,
    entryId: raw.entryId ?? null,
  };
  const errors = validateGoalContributionInput(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

/**
 * Uma contribuição só pode apontar para uma transferência ativa, na moeda do objetivo, que ainda
 * não esteja ligada a outra contribuição: assim o mesmo dinheiro nunca conta duas vezes.
 */
async function checkLinkedEntry(
  tx: SqlExecutor,
  entryId: string | null,
  currency: string,
  contributionId: string | null,
) {
  if (entryId === null) return;
  const entry = await tx.first<{ type: string; currency: string }>(
    `SELECT e.type AS type, a.currency AS currency
       FROM entries e JOIN accounts a ON a.id = e.account_id
      WHERE e.id = ? AND e.deleted_at IS NULL`,
    [entryId],
  );
  if (!entry) throw new ValidationError({ entryId: 'invalid' });
  if (entry.type !== 'transfer') throw new ValidationError({ entryId: 'transferOnly' });
  if (entry.currency !== currency) throw new ValidationError({ entryId: 'currencyMismatch' });
  const taken = await tx.first(
    `SELECT 1 FROM goal_contributions
      WHERE entry_id = ? AND deleted_at IS NULL AND id IS NOT ?`,
    [entryId, contributionId],
  );
  if (taken) throw new ValidationError({ entryId: 'entryAlreadyLinked' });
}

export function createSqliteSavingsGoalRepository(
  context: SqliteRepositoryContext,
): SavingsGoalRepository {
  const { db } = context;

  const findGoal = (executor: SqlExecutor, id: string) =>
    executor
      .first<GoalRow>(
        `SELECT ${GOAL_COLUMNS} FROM goals g WHERE g.id = ? AND g.deleted_at IS NULL`,
        [id],
      )
      .then((row) => (row ? toGoal(row) : null));

  return {
    async list() {
      const rows = await db.all<GoalRow>(
        `SELECT ${GOAL_COLUMNS} FROM goals g WHERE g.deleted_at IS NULL
         ORDER BY g.name, g.rowid`,
      );
      return rows.map(toGoal);
    },

    async progress({ from, to }) {
      const rows = await db.all<{
        id: string;
        name: string;
        currency: string;
        target_amount: number;
        target_on: string | null;
        saved_amount: number | null;
        period_amount: number | null;
      }>(
        `SELECT g.id AS id, g.name AS name, g.currency AS currency,
           g.target_amount AS target_amount, g.target_on AS target_on,
           SUM(c.amount) AS saved_amount,
           SUM(CASE WHEN c.date >= ? AND c.date <= ? THEN c.amount ELSE 0 END) AS period_amount
         FROM goals g
         LEFT JOIN goal_contributions c
           ON c.goal_id = g.id AND c.deleted_at IS NULL
         WHERE g.deleted_at IS NULL
         GROUP BY g.id
         ORDER BY g.name, g.rowid`,
        [from, to],
      );
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        currency: row.currency,
        targetAmount: row.target_amount,
        targetOn: row.target_on,
        savedAmount: Number(row.saved_amount ?? 0),
        contributedInPeriod: Number(row.period_amount ?? 0),
      }));
    },

    get(id) {
      return findGoal(db, id);
    },

    create(raw) {
      return write(context, ['goals'], () =>
        db.transaction(async (tx) => {
          const input = prepareGoal(raw);
          await checkGoalAccount(tx, input);
          const id = context.newId();
          const timestamp = context.now();
          await tx.run(
            `INSERT INTO goals (id, name, target_amount, currency, target_on, icon, color,
               description, account_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              input.name,
              input.targetAmount,
              input.currency,
              input.targetOn,
              input.icon,
              input.color,
              input.description,
              input.accountId,
              timestamp,
              timestamp,
            ],
          );
          return { id, ...input, createdAt: timestamp, updatedAt: timestamp };
        }),
      );
    },

    update(id, raw) {
      return write(context, ['goals'], () =>
        db.transaction(async (tx) => {
          const existing = await findGoal(tx, id);
          if (!existing) throw new NotFoundError('goal', id);
          const input = prepareGoal(raw, existing);
          if (input.currency !== existing.currency) {
            const contribution = await tx.first(
              `SELECT 1 FROM goal_contributions WHERE goal_id = ? AND deleted_at IS NULL`,
              [id],
            );
            if (contribution) throw new ValidationError({ currency: 'currencyLocked' });
          }
          await checkGoalAccount(tx, input);
          const timestamp = context.now();
          await tx.run(
            `UPDATE goals
                SET name = ?, target_amount = ?, currency = ?, target_on = ?, icon = ?, color = ?,
                    description = ?, account_id = ?, updated_at = ?
              WHERE id = ?`,
            [
              input.name,
              input.targetAmount,
              input.currency,
              input.targetOn,
              input.icon,
              input.color,
              input.description,
              input.accountId,
              timestamp,
              id,
            ],
          );
          return { ...existing, ...input, updatedAt: timestamp };
        }),
      );
    },

    delete(id) {
      return write(context, ['goals', 'goal_contributions'], () =>
        db.transaction(async (tx) => {
          const timestamp = context.now();
          const existing = await tx.first(
            'SELECT 1 FROM goals WHERE id = ? AND deleted_at IS NULL',
            [id],
          );
          if (!existing) throw new NotFoundError('goal', id);
          // Só as contribuições: os movimentos ligados ficam intactos.
          await tx.run(
            `UPDATE goal_contributions SET deleted_at = ?, updated_at = ?
              WHERE goal_id = ? AND deleted_at IS NULL`,
            [timestamp, timestamp, id],
          );
          await tx.run(
            `UPDATE goals SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
            [timestamp, timestamp, id],
          );
        }),
      );
    },

    async listContributions(goalId) {
      const rows = await db.all<ContributionRow>(
        `SELECT ${CONTRIBUTION_COLUMNS} FROM goal_contributions c
          WHERE c.goal_id = ? AND c.deleted_at IS NULL
          ORDER BY c.date DESC, c.rowid DESC`,
        [goalId],
      );
      return rows.map(toContribution);
    },

    async linkableTransfers(goalId) {
      const goal = await findGoal(db, goalId);
      if (!goal) return [];
      // Transferências na moeda do objetivo ainda sem contribuição; as que entram na conta
      // associada aparecem primeiro.
      const rows = await db.all<{
        id: string;
        date: string;
        amount: number;
        description: string;
        account_id: string;
        destination_account_id: string | null;
      }>(
        `SELECT e.id, e.date, e.amount, e.description, e.account_id, e.destination_account_id
           FROM entries e JOIN accounts a ON a.id = e.account_id
          WHERE e.deleted_at IS NULL AND e.type = 'transfer' AND a.currency = ?
            AND NOT EXISTS (SELECT 1 FROM goal_contributions c
                             WHERE c.entry_id = e.id AND c.deleted_at IS NULL)
          ORDER BY (e.destination_account_id IS ?) DESC, e.date DESC, e.rowid DESC
          LIMIT 20`,
        [goal.currency, goal.accountId],
      );
      return rows.map((row): LinkableTransfer => ({
        id: row.id,
        date: row.date,
        amount: row.amount,
        description: row.description,
        accountId: row.account_id,
        destinationAccountId: row.destination_account_id,
      }));
    },

    addContribution(raw) {
      return write(context, ['goal_contributions'], () =>
        db.transaction(async (tx) => {
          const input = prepareContribution(raw);
          const goal = await tx.first<{ currency: string }>(
            'SELECT currency FROM goals WHERE id = ? AND deleted_at IS NULL',
            [input.goalId],
          );
          if (!goal) throw new ValidationError({ goalId: 'required' });
          await checkLinkedEntry(tx, input.entryId, goal.currency, null);
          const id = context.newId();
          const timestamp = context.now();
          await tx.run(
            `INSERT INTO goal_contributions (id, goal_id, amount, date, entry_id, created_at,
               updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, input.goalId, input.amount, input.date, input.entryId, timestamp, timestamp],
          );
          return { id, ...input, createdAt: timestamp, updatedAt: timestamp };
        }),
      );
    },

    updateContribution(id, raw) {
      return write(context, ['goal_contributions'], () =>
        db.transaction(async (tx) => {
          const existing = await tx.first<ContributionRow & { currency: string }>(
            `SELECT ${CONTRIBUTION_COLUMNS}, g.currency AS currency
               FROM goal_contributions c JOIN goals g ON g.id = c.goal_id
              WHERE c.id = ? AND c.deleted_at IS NULL AND g.deleted_at IS NULL`,
            [id],
          );
          if (!existing) throw new NotFoundError('contribution', id);
          // O objetivo de uma contribuição não muda.
          const input = prepareContribution({
            ...raw,
            goalId: existing.goal_id,
            entryId: raw.entryId === undefined ? existing.entry_id : raw.entryId,
          });
          await checkLinkedEntry(tx, input.entryId, existing.currency, id);
          const timestamp = context.now();
          await tx.run(
            `UPDATE goal_contributions SET amount = ?, date = ?, entry_id = ?, updated_at = ?
              WHERE id = ?`,
            [input.amount, input.date, input.entryId, timestamp, id],
          );
          return {
            ...toContribution(existing),
            ...input,
            updatedAt: timestamp,
          };
        }),
      );
    },

    deleteContribution(id) {
      return write(context, ['goal_contributions'], async () => {
        const timestamp = context.now();
        const { changes } = await db.run(
          `UPDATE goal_contributions SET deleted_at = ?, updated_at = ?
            WHERE id = ? AND deleted_at IS NULL`,
          [timestamp, timestamp, id],
        );
        if (changes === 0) throw new NotFoundError('contribution', id);
      });
    },
  };
}
