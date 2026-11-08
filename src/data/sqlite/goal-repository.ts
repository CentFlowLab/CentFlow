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

import { NotFoundError } from '../errors';
import type { SavingsGoalRepository } from '../repositories/types';
import { write, type SqliteRepositoryContext } from './context';

type GoalRow = {
  id: string;
  name: string;
  target_amount: number;
  currency: string;
  target_on: string | null;
  created_at: string;
  updated_at: string;
};

type ContributionRow = {
  id: string;
  goal_id: string;
  amount: number;
  date: string;
  created_at: string;
  updated_at: string;
};

const GOAL_COLUMNS = `id, name, target_amount, currency, target_on, created_at, updated_at`;
const CONTRIBUTION_COLUMNS = `id, goal_id, amount, date, created_at, updated_at`;

function toGoal(row: GoalRow): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    currency: row.currency,
    targetOn: row.target_on,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function prepareGoal(raw: SavingsGoalInput): SavingsGoalInput {
  const targetOn = raw.targetOn?.trim() ?? '';
  const input: SavingsGoalInput = {
    name: raw.name.trim(),
    targetAmount: raw.targetAmount,
    currency: raw.currency.trim().toUpperCase(),
    targetOn: targetOn === '' ? null : targetOn,
  };
  const errors = validateSavingsGoalInput(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

function prepareContribution(raw: GoalContributionInput): GoalContributionInput {
  const input: GoalContributionInput = {
    goalId: raw.goalId.trim(),
    amount: raw.amount,
    date: raw.date,
  };
  const errors = validateGoalContributionInput(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

export function createSqliteSavingsGoalRepository(
  context: SqliteRepositoryContext,
): SavingsGoalRepository {
  const { db } = context;

  return {
    async list() {
      const rows = await db.all<GoalRow>(
        `SELECT ${GOAL_COLUMNS} FROM goals WHERE deleted_at IS NULL
         ORDER BY name, rowid`,
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

    async get(id) {
      const row = await db.first<GoalRow>(
        `SELECT ${GOAL_COLUMNS} FROM goals WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      return row ? toGoal(row) : null;
    },

    create(raw) {
      return write(context, ['goals'], () =>
        db.transaction(async (tx) => {
          const input = prepareGoal(raw);
          const id = context.newId();
          const timestamp = context.now();
          await tx.run(
            `INSERT INTO goals (id, name, target_amount, currency, target_on, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              input.name,
              input.targetAmount,
              input.currency,
              input.targetOn,
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
          const existing = await tx.first<GoalRow>(
            `SELECT ${GOAL_COLUMNS} FROM goals WHERE id = ? AND deleted_at IS NULL`,
            [id],
          );
          if (!existing) throw new NotFoundError('goal', id);
          const input = prepareGoal(raw);
          if (input.currency !== existing.currency) {
            const contribution = await tx.first(
              `SELECT 1 FROM goal_contributions WHERE goal_id = ? AND deleted_at IS NULL`,
              [id],
            );
            if (contribution) throw new ValidationError({ currency: 'currencyLocked' });
          }
          const timestamp = context.now();
          await tx.run(
            `UPDATE goals
                SET name = ?, target_amount = ?, currency = ?, target_on = ?, updated_at = ?
              WHERE id = ?`,
            [input.name, input.targetAmount, input.currency, input.targetOn, timestamp, id],
          );
          return { ...toGoal(existing), ...input, updatedAt: timestamp };
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
        `SELECT ${CONTRIBUTION_COLUMNS} FROM goal_contributions
          WHERE goal_id = ? AND deleted_at IS NULL
          ORDER BY date DESC, rowid DESC`,
        [goalId],
      );
      return rows.map(toContribution);
    },

    addContribution(raw) {
      return write(context, ['goal_contributions'], () =>
        db.transaction(async (tx) => {
          const input = prepareContribution(raw);
          const goal = await tx.first('SELECT 1 FROM goals WHERE id = ? AND deleted_at IS NULL', [
            input.goalId,
          ]);
          if (!goal) throw new ValidationError({ goalId: 'required' });
          const id = context.newId();
          const timestamp = context.now();
          await tx.run(
            `INSERT INTO goal_contributions (id, goal_id, amount, date, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, input.goalId, input.amount, input.date, timestamp, timestamp],
          );
          return { id, ...input, createdAt: timestamp, updatedAt: timestamp };
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
