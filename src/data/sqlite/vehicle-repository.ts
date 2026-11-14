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
  make: string | null;
  model: string | null;
  year: number | null;
  fuel_type: Vehicle['fuelType'];
  acquired_on: string | null;
  purchase_amount: number | null;
  currency: string | null;
  road_tax_due: string | null;
  service_due_on: string | null;
  service_due_km: number | null;
  notes: string | null;
  kind_label: string | null;
  icon: string | null;
  costs_paid_by: string | null;
  created_at: string;
  updated_at: string;
};

/** Colunas editáveis, pela ordem dos valores em `values`. */
const FIELDS = [
  'name',
  'kind',
  'plate',
  'odometer_km',
  'inspection_due',
  'insurance_due',
  'make',
  'model',
  'year',
  'fuel_type',
  'acquired_on',
  'purchase_amount',
  'currency',
  'road_tax_due',
  'service_due_on',
  'service_due_km',
  'notes',
  'kind_label',
  'icon',
  'costs_paid_by',
] as const;

const COLUMNS = `id, ${FIELDS.join(', ')}, created_at, updated_at`;

function toVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    plate: row.plate,
    odometerKm: row.odometer_km,
    inspectionDue: row.inspection_due,
    insuranceDue: row.insurance_due,
    make: row.make,
    model: row.model,
    year: row.year,
    fuelType: row.fuel_type,
    acquiredOn: row.acquired_on,
    purchaseAmount: row.purchase_amount,
    currency: row.currency,
    roadTaxDue: row.road_tax_due,
    serviceDueOn: row.service_due_on,
    serviceDueKm: row.service_due_km,
    notes: row.notes,
    kindLabel: row.kind_label,
    icon: row.icon,
    costsPaidBy: row.costs_paid_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type StoredVehicle = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>;

const blankToNull = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

/** Sem um campo novo no `raw` (ecrãs antigos), mantém o valor de `existing`. */
function prepare(raw: VehicleInput, existing?: StoredVehicle): StoredVehicle {
  const keep = <K extends keyof StoredVehicle>(key: K): StoredVehicle[K] | null =>
    raw[key as keyof VehicleInput] === undefined
      ? (existing?.[key] ?? null)
      : (raw[key as keyof VehicleInput] as StoredVehicle[K]);
  const currency = blankToNull(keep('currency'))?.toUpperCase() ?? null;
  const input: StoredVehicle = {
    name: raw.name.trim(),
    kind: raw.kind,
    plate: blankToNull(raw.plate)?.toUpperCase() ?? null,
    odometerKm: raw.odometerKm,
    inspectionDue: raw.inspectionDue,
    insuranceDue: raw.insuranceDue,
    make: blankToNull(keep('make')),
    model: blankToNull(keep('model')),
    year: keep('year'),
    fuelType: keep('fuelType'),
    acquiredOn: keep('acquiredOn'),
    purchaseAmount: keep('purchaseAmount'),
    currency,
    roadTaxDue: keep('roadTaxDue'),
    serviceDueOn: keep('serviceDueOn'),
    serviceDueKm: keep('serviceDueKm'),
    notes: blankToNull(keep('notes')),
    kindLabel: blankToNull(keep('kindLabel')),
    icon: blankToNull(keep('icon')),
    costsPaidBy: blankToNull(keep('costsPaidBy')),
  };
  const errors = validateVehicleInput(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

const values = (input: StoredVehicle) => [
  input.name,
  input.kind,
  input.plate,
  input.odometerKm,
  input.inspectionDue,
  input.insuranceDue,
  input.make,
  input.model,
  input.year,
  input.fuelType,
  input.acquiredOn,
  input.purchaseAmount,
  input.currency,
  input.roadTaxDue,
  input.serviceDueOn,
  input.serviceDueKm,
  input.notes,
  input.kindLabel,
  input.icon,
  input.costsPaidBy,
];

export function createSqliteVehicleRepository(context: SqliteRepositoryContext): VehicleRepository {
  const { db } = context;

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
            `INSERT INTO vehicles (id, ${FIELDS.join(', ')}, created_at, updated_at)
             VALUES (${['?', ...FIELDS.map(() => '?'), '?', '?'].join(', ')})`,
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
          const before = toVehicle(existing);
          const input = prepare(raw, before);
          const timestamp = context.now();
          await tx.run(
            `UPDATE vehicles SET ${FIELDS.map((field) => `${field} = ?`).join(', ')}, updated_at = ?
              WHERE id = ?`,
            [...values(input), timestamp, id],
          );
          return { ...before, ...input, updatedAt: timestamp };
        }),
      );
    },

    async countLinks(id) {
      const [entries, documents] = [
        await db.first<{ total: number }>(
          'SELECT COUNT(*) AS total FROM entries WHERE vehicle_id = ? AND deleted_at IS NULL',
          [id],
        ),
        await db.first<{ total: number }>(
          'SELECT COUNT(*) AS total FROM documents WHERE vehicle_id = ? AND deleted_at IS NULL',
          [id],
        ),
      ];
      const external = await db.first<{ total: number }>(
        'SELECT COUNT(*) AS total FROM vehicle_external_costs WHERE vehicle_id = ? AND deleted_at IS NULL',
        [id],
      );
      return {
        entries: entries?.total ?? 0,
        documents: documents?.total ?? 0,
        externalCosts: external?.total ?? 0,
      };
    },

    delete(id) {
      return write(context, ['vehicles', 'entries', 'documents'], () =>
        db.transaction(async (tx) => {
          const timestamp = context.now();
          const { changes } = await tx.run(
            `UPDATE vehicles SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
            [timestamp, timestamp, id],
          );
          if (changes === 0) throw new NotFoundError('vehicle', id);
          // Os movimentos são dinheiro real: ficam, só perdem a ligação (ADR-054, decisão 4).
          await tx.run(
            `UPDATE entries SET vehicle_id = NULL, vehicle_cost_type = NULL, quantity_milli = NULL,
               odometer_km = NULL, updated_at = ? WHERE vehicle_id = ?`,
            [timestamp, id],
          );
          await tx.run(
            'UPDATE documents SET vehicle_id = NULL, updated_at = ? WHERE vehicle_id = ?',
            [timestamp, id],
          );
        }),
      );
    },
  };
}
