import {
  normalizeEntryInput,
  validateEntryInput,
  validateOdometerReading,
  validateVehicleInput,
  type EntryInput,
} from '..';
import {
  currentOdometer,
  parseQuantityMilli,
  quantityToInputString,
  vehicleDeadlines,
  vehicleStats,
  type VehicleEntry,
} from '../vehicles';

let next = 0;
const entry = (overrides: Partial<VehicleEntry>): VehicleEntry => ({
  id: `e${(next += 1)}`,
  type: 'expense',
  amount: 0,
  date: '2026-01-01',
  vehicleCostType: 'other',
  quantityMilli: null,
  odometerKm: null,
  ...overrides,
});

const fuel = (date: string, amount: number, litres: number, km: number) =>
  entry({ date, amount, vehicleCostType: 'fuel', quantityMilli: litres * 1000, odometerKm: km });

describe('vehicle stats', () => {
  it('counts each entry once and keeps the purchase apart', () => {
    const stats = vehicleStats(
      { purchaseAmount: 1_500_000 },
      [
        entry({ amount: 24_000, vehicleCostType: 'tyres', date: '2026-11-05' }),
        entry({ amount: 30_000, vehicleCostType: 'insurance', date: '2026-03-01' }),
        entry({ type: 'income', amount: 5_000, vehicleCostType: 'insurance', date: '2026-11-06' }),
        entry({ amount: 1_800_000, vehicleCostType: 'purchase', date: '2025-06-01' }),
      ],
      '2026-11-11',
    );
    expect(stats.spent).toBe(49_000);
    expect(stats.spentThisMonth).toBe(19_000);
    expect(stats.spentThisYear).toBe(49_000);
    expect(stats.byType).toEqual({ tyres: 24_000, insurance: 25_000 });
    // O movimento de compra marcado ganha ao valor informativo: nunca os dois.
    expect(stats.purchase).toMatchObject({ amount: 1_800_000, source: 'entry' });
    expect(stats.ownershipCost).toBe(1_849_000);
  });

  it('counts only what happened since the acquisition date', () => {
    const stats = vehicleStats(
      { purchaseAmount: null, acquiredOn: '2026-06-01' },
      [
        entry({ amount: 5_000, vehicleCostType: 'repair', date: '2026-05-20' }),
        entry({ amount: 1_000_000, vehicleCostType: 'purchase', date: '2026-05-28' }),
        entry({ amount: 3_000, vehicleCostType: 'tyres', date: '2026-07-01' }),
      ],
      '2026-11-11',
    );
    expect(stats.spent).toBe(3_000);
    expect(stats.beforeAcquisition).toBe(1);
    expect(stats.purchase).toMatchObject({ amount: 1_000_000, source: 'entry' });
    expect(stats.ownershipCost).toBe(1_003_000);
  });

  it('never takes an income marked as purchase off the ownership cost', () => {
    const stats = vehicleStats(
      { purchaseAmount: 1_500_000 },
      [entry({ type: 'income', amount: 900_000, vehicleCostType: 'purchase' })],
      '2026-11-11',
    );
    expect(stats.purchase).toMatchObject({ amount: 1_500_000, source: 'vehicle' });
    expect(stats.ownershipCost).toBe(1_500_000);
  });

  it('uses the informative purchase amount only without a purchase entry', () => {
    const stats = vehicleStats({ purchaseAmount: 1_500_000 }, [], '2026-11-11');
    expect(stats.purchase).toEqual({ amount: 1_500_000, source: 'vehicle', entryId: null });
    expect(stats.costPerKm).toBeNull();
  });

  it('computes fuel price and separate costs per km only with a positive distance', () => {
    const entries = [
      fuel('2026-10-01', 7_000, 40, 50_000),
      fuel('2026-10-15', 6_000, 35, 50_600),
      entry({ amount: 4_000, vehicleCostType: 'parking_tolls', date: '2026-10-20' }),
      fuel('2026-11-01', 6_500, 38, 51_200),
    ];
    const stats = vehicleStats({ purchaseAmount: null }, entries, '2026-11-11');
    expect(stats.fuel).toMatchObject({ quantityMilli: 113_000, amount: 19_500, fills: 3 });
    expect(stats.fuel.pricePerLitre).toBeCloseTo((19_500 * 1000) / 113_000);
    // 1200 km; depois da primeira leitura: 6000 + 6500 de combustível e 4000 de portagens.
    expect(stats.costPerKm).toMatchObject({ km: 1_200, fromKm: 50_000, toKm: 51_200 });
    expect(stats.costPerKm?.fuelPerKm).toBeCloseTo(12_500 / 1_200);
    expect(stats.costPerKm?.totalPerKm).toBeCloseTo(16_500 / 1_200);
    // Consumo: 35 + 38 litros depois da primeira leitura, em 1200 km.
    expect(stats.costPerKm?.quantityPer100Km).toBeCloseTo((73_000 / 1_200) * 100);

    // Uma só leitura, leituras no mesmo dia ou distância nula: sem custo por km.
    const single = vehicleStats({ purchaseAmount: null }, entries.slice(0, 1), '2026-11-11');
    expect(single.costPerKm).toBeNull();
    const sameDay = vehicleStats(
      { purchaseAmount: null },
      [fuel('2026-10-01', 1, 1, 100), fuel('2026-10-01', 1, 1, 200)],
      '2026-11-11',
    );
    expect(sameDay.costPerKm).toBeNull();
    const noDistance = vehicleStats(
      { purchaseAmount: null },
      [fuel('2026-10-01', 1, 1, 100), fuel('2026-10-02', 1, 1, 100)],
      '2026-11-11',
    );
    expect(noDistance.costPerKm).toBeNull();
  });
});

describe('vehicle deadlines', () => {
  it('orders by urgency and checks the service by date or km', () => {
    const deadlines = vehicleDeadlines(
      {
        insuranceDue: '2027-03-01',
        inspectionDue: '2026-11-01',
        roadTaxDue: '2026-11-30',
        serviceDueOn: null,
        serviceDueKm: 60_000,
      },
      '2026-11-11',
      59_500,
    );
    expect(deadlines.map((deadline) => [deadline.kind, deadline.status])).toEqual([
      ['inspection', 'overdue'],
      ['roadTax', 'soon'],
      ['service', 'soon'],
      ['insurance', 'ok'],
    ]);
    expect(deadlines.find((deadline) => deadline.kind === 'service')?.kmLeft).toBe(500);
    expect(deadlines.find((deadline) => deadline.kind === 'roadTax')?.daysLeft).toBe(19);
  });

  it('takes the highest known odometer reading', () => {
    expect(
      currentOdometer({ odometerKm: 1000 }, [{ odometerKm: 1500 }, { odometerKm: null }]),
    ).toBe(1500);
    expect(currentOdometer({ odometerKm: null }, [])).toBeNull();
  });
});

describe('vehicle validation', () => {
  const context = {
    accounts: new Map([['a', { id: 'a', currency: 'EUR', archivedAt: null }]]),
    categories: new Map([['c', { id: 'c', type: 'expense' as const }]]),
    vehicles: new Set(['v']),
  };
  const base: EntryInput = {
    type: 'expense',
    amount: 24_000,
    description: 'Pneus',
    categoryId: 'c',
    accountId: 'a',
    destinationAccountId: null,
    date: '2026-11-05',
    notes: null,
  };

  it('accepts category, vehicle and account together', () => {
    const input = normalizeEntryInput({ ...base, vehicleId: 'v', vehicleCostType: 'tyres' });
    expect(validateEntryInput(input, context)).toEqual({});
  });

  it('rejects impossible combinations and values', () => {
    expect(validateEntryInput({ ...base, vehicleId: 'v' }, context)).toEqual({
      vehicleCostType: 'required',
    });
    expect(
      validateEntryInput({ ...base, vehicleId: 'x', vehicleCostType: 'fuel' }, context),
    ).toEqual({ vehicleId: 'invalid' });
    expect(
      validateEntryInput(
        { ...base, vehicleId: 'v', vehicleCostType: 'tyres', quantityMilli: 40_000 },
        context,
      ),
    ).toEqual({ quantityMilli: 'invalid' });
    expect(
      validateEntryInput(
        { ...base, vehicleId: 'v', vehicleCostType: 'fuel', quantityMilli: 2_000_000 },
        context,
      ),
    ).toEqual({ quantityMilli: 'invalid' });
    expect(validateEntryInput({ ...base, odometerKm: 100 }, context)).toEqual({
      odometerKm: 'invalid',
    });
    // A compra é sempre uma despesa.
    expect(
      validateEntryInput(
        { ...base, type: 'income', categoryId: 'c', vehicleId: 'v', vehicleCostType: 'purchase' },
        context,
      ),
    ).toMatchObject({ vehicleCostType: 'purchaseNotExpense' });
    // Transferências nunca ficam ligadas a um veículo.
    expect(normalizeEntryInput({ ...base, type: 'transfer', vehicleId: 'v' }).vehicleId).toBeNull();
  });

  it('refuses odometer readings out of order', () => {
    const others = [
      { date: '2026-10-01', odometerKm: 50_000 },
      { date: '2026-11-01', odometerKm: 51_000 },
    ];
    expect(validateOdometerReading({ date: '2026-10-15', odometerKm: 50_500 }, others)).toBeNull();
    expect(validateOdometerReading({ date: '2026-10-15', odometerKm: 49_000 }, others)).toBe(
      'odometerOutOfOrder',
    );
    expect(validateOdometerReading({ date: '2026-10-15', odometerKm: 52_000 }, others)).toBe(
      'odometerOutOfOrder',
    );
  });

  it('validates the new vehicle fields', () => {
    const vehicle = {
      name: 'Clio',
      kind: 'car' as const,
      plate: '50-XO-29',
      odometerKm: null,
      inspectionDue: null,
      insuranceDue: null,
    };
    expect(validateVehicleInput({ ...vehicle, year: 2019, fuelType: 'diesel' })).toEqual({});
    expect(validateVehicleInput({ ...vehicle, purchaseAmount: 1_500_000 })).toEqual({
      currency: 'required',
    });
    expect(validateVehicleInput({ ...vehicle, year: 1800, serviceDueKm: -1 })).toEqual({
      year: 'invalid',
      serviceDueKm: 'invalid',
    });
  });
});

describe('litres input', () => {
  it('reads litres into whole millilitres and back', () => {
    expect(parseQuantityMilli('40,5')).toBe(40_500);
    expect(parseQuantityMilli('40.125')).toBe(40_125);
    expect(parseQuantityMilli(' 38 ')).toBe(38_000);
    expect(parseQuantityMilli('0,001')).toBe(1);
    for (const bad of ['', '0', '40,1234', 'abc', '-3', '1001', '1,2,3']) {
      expect(parseQuantityMilli(bad)).toBeNull();
    }
    expect(quantityToInputString(40_500, ',')).toBe('40,5');
    expect(quantityToInputString(38_000, '.')).toBe('38');
  });
});
