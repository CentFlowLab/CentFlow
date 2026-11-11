import { daysUntil, deadlineStatus, type DeadlineStatus } from './deadlines';
import { monthOf, type CalendarDate } from './dates';
import { VEHICLE_LIMITS, type Entry, type Vehicle, type VehicleCostType } from './types';

/** Movimento ligado a um veículo, com o que os cálculos precisam (ADR-054). */
export type VehicleEntry = Pick<
  Entry,
  'id' | 'type' | 'amount' | 'date' | 'vehicleCostType' | 'quantityMilli' | 'odometerKm'
>;

/** Revisão por quilómetros: "em breve" a partir de 1000 km. */
export const SERVICE_SOON_KM = 1000;

export type VehicleDeadlineKind = 'insurance' | 'inspection' | 'roadTax' | 'service';

export type VehicleDeadline = {
  kind: VehicleDeadlineKind;
  dueOn: CalendarDate | null;
  dueKm: number | null;
  daysLeft: number | null;
  kmLeft: number | null;
  status: Exclude<DeadlineStatus, 'none'>;
};

const SEVERITY: Record<VehicleDeadline['status'], number> = { overdue: 0, soon: 1, ok: 2 };

/** Maior leitura conhecida: a do veículo ou a mais alta dos movimentos. */
export function currentOdometer(
  vehicle: Pick<Vehicle, 'odometerKm'>,
  entries: readonly Pick<VehicleEntry, 'odometerKm'>[],
): number | null {
  let km = vehicle.odometerKm;
  for (const entry of entries) {
    if (entry.odometerKm !== null && (km === null || entry.odometerKm > km)) km = entry.odometerKm;
  }
  return km;
}

/** Prazos com data ou quilómetros, do mais urgente para o menos urgente. */
export function vehicleDeadlines(
  vehicle: Pick<
    Vehicle,
    'insuranceDue' | 'inspectionDue' | 'roadTaxDue' | 'serviceDueOn' | 'serviceDueKm'
  >,
  today: CalendarDate,
  odometerKm: number | null,
): VehicleDeadline[] {
  const byDate = (kind: VehicleDeadlineKind, dueOn: CalendarDate | null): VehicleDeadline[] => {
    const status = deadlineStatus(dueOn, today);
    if (status === 'none') return [];
    return [{ kind, dueOn, dueKm: null, daysLeft: daysUntil(dueOn, today), kmLeft: null, status }];
  };
  const deadlines = [
    ...byDate('insurance', vehicle.insuranceDue),
    ...byDate('inspection', vehicle.inspectionDue),
    ...byDate('roadTax', vehicle.roadTaxDue),
  ];
  // Revisão: a data ou os quilómetros, o que chegar primeiro.
  const serviceByDate = deadlineStatus(vehicle.serviceDueOn, today);
  const kmLeft =
    vehicle.serviceDueKm !== null && odometerKm !== null ? vehicle.serviceDueKm - odometerKm : null;
  const serviceByKm: DeadlineStatus =
    kmLeft === null ? 'none' : kmLeft < 0 ? 'overdue' : kmLeft <= SERVICE_SOON_KM ? 'soon' : 'ok';
  const candidates = [serviceByDate, serviceByKm].filter(
    (status): status is VehicleDeadline['status'] => status !== 'none',
  );
  if (candidates.length > 0 || vehicle.serviceDueKm !== null) {
    const status = candidates.sort((a, b) => SEVERITY[a] - SEVERITY[b])[0] ?? 'ok';
    deadlines.push({
      kind: 'service',
      dueOn: vehicle.serviceDueOn,
      dueKm: vehicle.serviceDueKm,
      daysLeft: daysUntil(vehicle.serviceDueOn, today),
      kmLeft,
      status,
    });
  }
  return deadlines.sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status]);
}

export type VehicleCostPerKm = {
  fromKm: number;
  toKm: number;
  km: number;
  fromDate: CalendarDate;
  toDate: CalendarDate;
  /** Combustível por km (unidades mínimas por km, com decimais: arredondar só ao mostrar). */
  fuelPerKm: number | null;
  /** Todas as despesas do veículo por km, exceto a compra. */
  totalPerKm: number;
};

export type VehicleStats = {
  /** Despesas menos rendimentos do veículo, sem a compra. */
  spent: number;
  spentThisMonth: number;
  spentThisYear: number;
  byType: Partial<Record<VehicleCostType, number>>;
  /** Compra: o movimento marcado, ou o valor informativo do veículo (nunca os dois). */
  purchase: { amount: number; source: 'entry' | 'vehicle'; entryId: string | null } | null;
  /** Compra + despesas. */
  ownershipCost: number;
  fuel: { quantityMilli: number; amount: number; fills: number; pricePerLitre: number | null };
  /** Só com duas leituras em datas diferentes e distância positiva (ADR-054). */
  costPerKm: VehicleCostPerKm | null;
};

function signed(entry: Pick<VehicleEntry, 'type' | 'amount'>): number {
  return entry.type === 'income' ? -entry.amount : entry.type === 'expense' ? entry.amount : 0;
}

/**
 * Estatísticas de um veículo a partir dos movimentos ligados (na moeda do veículo). Os relatórios
 * gerais não usam isto: somam os movimentos uma vez, como sempre.
 */
export function vehicleStats(
  vehicle: Pick<Vehicle, 'purchaseAmount'>,
  entries: readonly VehicleEntry[],
  today: CalendarDate,
): VehicleStats {
  const month = monthOf(today);
  const year = today.slice(0, 4);
  const byType: Partial<Record<VehicleCostType, number>> = {};
  let spent = 0;
  let spentThisMonth = 0;
  let spentThisYear = 0;
  let purchaseEntry: VehicleEntry | null = null;
  const fuel = { quantityMilli: 0, amount: 0, fills: 0 };

  for (const entry of entries) {
    if (entry.type === 'transfer') continue;
    if (entry.vehicleCostType === 'purchase') {
      purchaseEntry = entry;
      continue;
    }
    const value = signed(entry);
    spent += value;
    if (monthOf(entry.date) === month) spentThisMonth += value;
    if (entry.date.startsWith(year)) spentThisYear += value;
    const type = entry.vehicleCostType ?? 'other';
    byType[type] = (byType[type] ?? 0) + value;
    if (entry.vehicleCostType === 'fuel' && entry.type === 'expense') {
      fuel.amount += entry.amount;
      fuel.fills += 1;
      if (entry.quantityMilli !== null) fuel.quantityMilli += entry.quantityMilli;
    }
  }

  const purchase = purchaseEntry
    ? { amount: signed(purchaseEntry), source: 'entry' as const, entryId: purchaseEntry.id }
    : vehicle.purchaseAmount !== null
      ? { amount: vehicle.purchaseAmount, source: 'vehicle' as const, entryId: null }
      : null;

  // Preço médio só com os abastecimentos que têm litros.
  const withQuantity = entries.filter(
    (entry) =>
      entry.type === 'expense' && entry.vehicleCostType === 'fuel' && entry.quantityMilli !== null,
  );
  const pricedAmount = withQuantity.reduce((sum, entry) => sum + entry.amount, 0);
  const pricedQuantity = withQuantity.reduce((sum, entry) => sum + (entry.quantityMilli ?? 0), 0);

  return {
    spent,
    spentThisMonth,
    spentThisYear,
    byType,
    purchase,
    ownershipCost: (purchase?.amount ?? 0) + spent,
    fuel: {
      ...fuel,
      pricePerLitre: pricedQuantity > 0 ? (pricedAmount * 1000) / pricedQuantity : null,
    },
    costPerKm: costPerKm(entries),
  };
}

/**
 * Custo por km entre a primeira e a última leitura. Conta as despesas depois da primeira leitura
 * até à última (o depósito cheio na primeira leitura serve os km seguintes).
 */
function costPerKm(entries: readonly VehicleEntry[]): VehicleCostPerKm | null {
  const readings = entries
    .filter((entry) => entry.odometerKm !== null)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const first = readings[0];
  const last = readings[readings.length - 1];
  if (!first || !last || first.date === last.date) return null;
  const km = (last.odometerKm ?? 0) - (first.odometerKm ?? 0);
  if (km <= 0) return null;
  let total = 0;
  let fuel = 0;
  let fuelEntries = 0;
  for (const entry of entries) {
    if (entry.date <= first.date || entry.date > last.date) continue;
    if (entry.type === 'transfer' || entry.vehicleCostType === 'purchase') continue;
    total += signed(entry);
    if (entry.vehicleCostType === 'fuel' && entry.type === 'expense') {
      fuel += entry.amount;
      fuelEntries += 1;
    }
  }
  return {
    fromKm: first.odometerKm ?? 0,
    toKm: last.odometerKm ?? 0,
    km,
    fromDate: first.date,
    toDate: last.date,
    fuelPerKm: fuelEntries > 0 ? fuel / km : null,
    totalPerKm: total / km,
  };
}

/**
 * Litros escritos pela pessoa ("40,5", "40.5") em mililitros inteiros, sem aritmética de vírgula
 * flutuante. `null` para vazio ou inválido (mais de 3 casas, letras, zero ou acima do limite).
 */
export function parseQuantityMilli(text: string): number | null {
  const match = /^(\d{1,4})(?:[.,](\d{1,3}))?$/.exec(text.trim());
  if (!match) return null;
  const milli = Number(match[1]) * 1000 + Number((match[2] ?? '').padEnd(3, '0'));
  return milli >= 1 && milli <= VEHICLE_LIMITS.maxQuantityMilli ? milli : null;
}

/** Mililitros para o campo de texto (40500 → "40,5"). */
export function quantityToInputString(milli: number, decimalSeparator: ',' | '.'): string {
  const whole = Math.floor(milli / 1000);
  const fraction = String(milli % 1000)
    .padStart(3, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}${decimalSeparator}${fraction}` : String(whole);
}
