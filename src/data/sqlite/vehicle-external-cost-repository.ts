import {
  hasErrors,
  validateVehicleExternalCost,
  ValidationError,
  type VehicleExternalCost,
  type VehicleExternalCostInput,
} from '@/core/finance';

import type { SqlExecutor } from '../db/sql-database';
import { NotFoundError } from '../errors';
import type { VehicleExternalCostRepository } from '../repositories/types';
import { write, type SqliteRepositoryContext } from './context';

type Row = {
  id: string;
  vehicle_id: string;
  date: string;
  amount: number;
  currency: string;
  cost_type: VehicleExternalCost['costType'];
  quantity_milli: number | null;
  odometer_km: number | null;
  description: string;
  payer: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const FIELDS = [
  'vehicle_id',
  'date',
  'amount',
  'currency',
  'cost_type',
  'quantity_milli',
  'odometer_km',
  'description',
  'payer',
  'notes',
] as const;
const COLUMNS = `id, ${FIELDS.join(', ')}, created_at, updated_at`;

function toCost(row: Row): VehicleExternalCost {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    date: row.date,
    amount: row.amount,
    currency: row.currency,
    costType: row.cost_type,
    quantityMilli: row.quantity_milli,
    odometerKm: row.odometer_km,
    description: row.description,
    payer: row.payer,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function prepare(raw: VehicleExternalCostInput): VehicleExternalCostInput {
  const text = (value: string | null) => {
    const trimmed = value?.trim() ?? '';
    return trimmed === '' ? null : trimmed;
  };
  const input: VehicleExternalCostInput = {
    ...raw,
    currency: raw.currency.trim().toUpperCase(),
    quantityMilli: raw.costType === 'fuel' ? raw.quantityMilli : null,
    description: raw.description.trim(),
    payer: text(raw.payer),
    notes: text(raw.notes),
  };
  const errors = validateVehicleExternalCost(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

const values = (input: VehicleExternalCostInput) => [
  input.vehicleId,
  input.date,
  input.amount,
  input.currency,
  input.costType,
  input.quantityMilli,
  input.odometerKm,
  input.description,
  input.payer,
  input.notes,
];

/**
 * Custos pagos por terceiros (ADR-081). Nenhuma escrita aqui toca em `entries`, contas, orçamentos
 * ou património: estes custos só existem na ficha da viatura.
 */
export function createSqliteVehicleExternalCostRepository(
  context: SqliteRepositoryContext,
): VehicleExternalCostRepository {
  const { db } = context;

  async function find(tx: SqlExecutor, id: string): Promise<VehicleExternalCost> {
    const row = await tx.first<Row>(
      `SELECT ${COLUMNS} FROM vehicle_external_costs WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    if (!row) throw new NotFoundError('vehicle_external_cost', id);
    return toCost(row);
  }

  return {
    async listForVehicle(vehicleId) {
      const rows = await db.all<Row>(
        `SELECT ${COLUMNS} FROM vehicle_external_costs
          WHERE vehicle_id = ? AND deleted_at IS NULL ORDER BY date DESC, created_at DESC`,
        [vehicleId],
      );
      return rows.map(toCost);
    },

    async get(id) {
      const row = await db.first<Row>(
        `SELECT ${COLUMNS} FROM vehicle_external_costs WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      return row ? toCost(row) : null;
    },

    create(raw) {
      return write(context, ['vehicle_external_costs'], () =>
        db.transaction(async (tx) => {
          const input = prepare(raw);
          const vehicle = await tx.first<{ id: string }>(
            'SELECT id FROM vehicles WHERE id = ? AND deleted_at IS NULL',
            [input.vehicleId],
          );
          if (!vehicle) throw new ValidationError({ vehicleId: 'invalid' });
          const id = context.newId();
          const timestamp = context.now();
          await tx.run(
            `INSERT INTO vehicle_external_costs (id, ${FIELDS.join(', ')}, created_at, updated_at)
             VALUES (${['?', ...FIELDS.map(() => '?'), '?', '?'].join(', ')})`,
            [id, ...values(input), timestamp, timestamp],
          );
          return { id, ...input, createdAt: timestamp, updatedAt: timestamp };
        }),
      );
    },

    update(id, raw) {
      return write(context, ['vehicle_external_costs'], () =>
        db.transaction(async (tx) => {
          const before = await find(tx, id);
          const input = prepare(raw);
          const timestamp = context.now();
          await tx.run(
            `UPDATE vehicle_external_costs
                SET ${FIELDS.map((field) => `${field} = ?`).join(', ')}, updated_at = ?
              WHERE id = ?`,
            [...values(input), timestamp, id],
          );
          return { ...before, ...input, updatedAt: timestamp };
        }),
      );
    },

    delete(id) {
      return write(context, ['vehicle_external_costs'], async () => {
        const timestamp = context.now();
        const { changes } = await db.run(
          `UPDATE vehicle_external_costs SET deleted_at = ?, updated_at = ?
            WHERE id = ? AND deleted_at IS NULL`,
          [timestamp, timestamp, id],
        );
        if (changes === 0) throw new NotFoundError('vehicle_external_cost', id);
      });
    },
  };
}
