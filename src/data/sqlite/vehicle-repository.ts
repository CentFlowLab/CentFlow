import {
  hasErrors,
  validateVehicleInput,
  ValidationError,
  type Vehicle,
  type VehicleInput,
} from '@/core/finance';

import { NotFoundError } from '../errors';
import type { VehicleRepository } from '../repositories/types';
import { write, type SqliteRepositoryContext } from './context';

type VehicleRow = {
  id: string;
  name: string;
  kind: Vehicle['kind'];
  plate: string | null;
  odometer_km: number | null;
  inspection_due: string | null;
  insurance_due: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = `id, name, kind, plate, odometer_km, inspection_due, insurance_due, created_at, updated_at`;

function toVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    plate: row.plate,
    odometerKm: row.odometer_km,
    inspectionDue: row.inspection_due,
    insuranceDue: row.insurance_due,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function prepare(raw: VehicleInput): VehicleInput {
  const plate = raw.plate?.trim().toUpperCase() ?? '';
  const input: VehicleInput = {
    name: raw.name.trim(),
    kind: raw.kind,
    plate: plate === '' ? null : plate,
    odometerKm: raw.odometerKm,
    inspectionDue: raw.inspectionDue,
    insuranceDue: raw.insuranceDue,
  };
  const errors = validateVehicleInput(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

export function createSqliteVehicleRepository(context: SqliteRepositoryContext): VehicleRepository {
  const { db } = context;
  const values = (input: VehicleInput) => [
    input.name,
    input.kind,
    input.plate,
    input.odometerKm,
    input.inspectionDue,
    input.insuranceDue,
  ];

  return {
    async list() {
      const rows = await db.all<VehicleRow>(
        `SELECT ${COLUMNS} FROM vehicles WHERE deleted_at IS NULL ORDER BY name, rowid`,
      );
      return rows.map(toVehicle);
    },

    async get(id) {
      const row = await db.first<VehicleRow>(
        `SELECT ${COLUMNS} FROM vehicles WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      return row ? toVehicle(row) : null;
    },

    create(raw) {
      return write(context, ['vehicles'], () =>
        db.transaction(async (tx) => {
          const input = prepare(raw);
          const id = context.newId();
          const timestamp = context.now();
          await tx.run(
            `INSERT INTO vehicles (id, name, kind, plate, odometer_km, inspection_due, insurance_due, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, ...values(input), timestamp, timestamp],
          );
          return { id, ...input, createdAt: timestamp, updatedAt: timestamp };
        }),
      );
    },

    update(id, raw) {
      return write(context, ['vehicles'], () =>
        db.transaction(async (tx) => {
          const existing = await tx.first<VehicleRow>(
            `SELECT ${COLUMNS} FROM vehicles WHERE id = ? AND deleted_at IS NULL`,
            [id],
          );
          if (!existing) throw new NotFoundError('vehicle', id);
          const input = prepare(raw);
          const timestamp = context.now();
          await tx.run(
            `UPDATE vehicles
                SET name = ?, kind = ?, plate = ?, odometer_km = ?, inspection_due = ?,
                    insurance_due = ?, updated_at = ?
              WHERE id = ?`,
            [...values(input), timestamp, id],
          );
          return { ...toVehicle(existing), ...input, updatedAt: timestamp };
        }),
      );
    },

    delete(id) {
      return write(context, ['vehicles'], async () => {
        const timestamp = context.now();
        const { changes } = await db.run(
          `UPDATE vehicles SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
          [timestamp, timestamp, id],
        );
        if (changes === 0) throw new NotFoundError('vehicle', id);
      });
    },
  };
}
