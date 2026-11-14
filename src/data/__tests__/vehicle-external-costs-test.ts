import {
  externalCostEntries,
  validateVehicleExternalCost,
  vehicleCostShares,
  vehicleStats,
  type VehicleExternalCostInput,
} from '@/core/finance';
import type { Repositories } from '@/data';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';

// ADR-081: custos pagos por terceiros contam na viatura e em mais lado nenhum.

let db: Awaited<ReturnType<typeof openTestRepositories>>['db'];
let repos: Repositories;
beforeEach(async () => {
  ({ db, repos } = await openTestRepositories());
});
afterEach(() => db.close());

const cost = (overrides: Partial<VehicleExternalCostInput> = {}): VehicleExternalCostInput => ({
  vehicleId: 'v1',
  date: '2026-11-10',
  amount: 6000,
  currency: 'EUR',
  costType: 'fuel',
  quantityMilli: 40000,
  odometerKm: 120000,
  description: '',
  payer: 'Nyah Lounge LDA',
  notes: null,
  ...overrides,
});

describe('validation', () => {
  it('accepts a fill-up paid by the company, in litres or kWh', () => {
    expect(validateVehicleExternalCost(cost())).toEqual({});
    expect(validateVehicleExternalCost(cost({ quantityMilli: 35500 }))).toEqual({});
  });

  it('rejects a purchase, a quantity outside fuel, bad amounts and limits', () => {
    expect(validateVehicleExternalCost(cost({ costType: 'purchase' as never })).costType).toBe(
      'invalid',
    );
    expect(
      validateVehicleExternalCost(cost({ costType: 'tyres', quantityMilli: 1000 })).quantityMilli,
    ).toBe('invalid');
    expect(validateVehicleExternalCost(cost({ quantityMilli: 1_000_001 })).quantityMilli).toBe(
      'invalid',
    );
    expect(validateVehicleExternalCost(cost({ amount: 0 })).amount).toBe('amountNotPositive');
    expect(validateVehicleExternalCost(cost({ odometerKm: -1 })).odometerKm).toBe('invalid');
    expect(validateVehicleExternalCost(cost({ currency: 'EU' })).currency).toBe('invalid');
    expect(validateVehicleExternalCost(cost({ date: '2026-13-01' })).date).toBe('invalidDate');
  });
});

describe('vehicle statistics', () => {
  const own = [
    {
      id: 'e1',
      type: 'expense' as const,
      amount: 10000,
      date: '2026-11-02',
      vehicleCostType: 'tyres' as const,
      quantityMilli: null,
      odometerKm: null,
    },
  ];
  const external = externalCostEntries([{ ...cost(), id: 'x1', createdAt: '', updatedAt: '' }]);

  it('adds external costs to the vehicle cost and keeps the old numbers without them', () => {
    const vehicle = { purchaseAmount: null };
    expect(vehicleStats(vehicle, own, '2026-11-14').spent).toBe(10000);
    expect(vehicleStats(vehicle, [...own, ...external], '2026-11-14').spent).toBe(16000);
    expect(vehicleCostShares(own, external)).toEqual({ own: 10000, others: 6000 });
    expect(vehicleCostShares(own, [])).toEqual({ own: 10000, others: 0 });
  });
});

describe('repository and integrity', () => {
  async function seed() {
    const bank = await repos.accounts.create({
      name: 'Banco',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 100000,
    });
    const category = await repos.categories.create({
      name: 'Carro',
      type: 'expense',
      icon: 'car-outline',
      color: 'indigo',
    });
    const van = await repos.vehicles.create({
      name: 'Carrinha',
      kind: 'van',
      plate: null,
      odometerKm: null,
      inspectionDue: null,
      insuranceDue: null,
      currency: 'EUR',
      costsPaidBy: 'Nyah Lounge LDA',
    });
    await repos.entries.create({
      type: 'expense',
      amount: 2500,
      description: 'Lavagem',
      categoryId: category.id,
      accountId: bank.id,
      destinationAccountId: null,
      date: '2026-11-05',
      notes: null,
      vehicleId: van.id,
      vehicleCostType: 'other',
      quantityMilli: null,
      odometerKm: null,
    });
    return { bank, van };
  }

  async function snapshot(bankId: string) {
    const balances = await repos.accounts.listWithBalances();
    return {
      balance: balances.find((account) => account.id === bankId)?.balance,
      aggregate: await repos.entries.aggregate({ from: '2026-01-01', to: '2026-12-31' }),
      byDate: await repos.entries.aggregateByDate({ from: '2026-01-01', to: '2026-12-31' }),
      entries: (await repos.entries.list()).items.length,
      wealth: await repos.wealth.list(),
    };
  }

  it('keeps the payer on the vehicle and creates, edits and deletes a cost', async () => {
    const { van } = await seed();
    expect((await repos.vehicles.get(van.id))?.costsPaidBy).toBe('Nyah Lounge LDA');
    const created = await repos.vehicleExternalCosts.create(cost({ vehicleId: van.id }));
    expect(await repos.vehicleExternalCosts.listForVehicle(van.id)).toEqual([created]);
    const updated = await repos.vehicleExternalCosts.update(
      created.id,
      cost({ vehicleId: van.id, amount: 6500 }),
    );
    expect(updated.amount).toBe(6500);
    await repos.vehicleExternalCosts.delete(created.id);
    expect(await repos.vehicleExternalCosts.listForVehicle(van.id)).toEqual([]);
  });

  it('never changes balances, aggregates, entries or net worth', async () => {
    const { bank, van } = await seed();
    const before = await snapshot(bank.id);
    await repos.vehicleExternalCosts.create(cost({ vehicleId: van.id }));
    await repos.vehicleExternalCosts.create(
      cost({ vehicleId: van.id, costType: 'insurance', quantityMilli: null, amount: 30000 }),
    );
    expect(await snapshot(bank.id)).toEqual(before);
  });

  it('keeps entries and external costs when the vehicle is deleted, and counts them first', async () => {
    const { van } = await seed();
    await repos.vehicleExternalCosts.create(cost({ vehicleId: van.id }));
    expect(await repos.vehicles.countLinks(van.id)).toEqual({
      entries: 1,
      documents: 0,
      externalCosts: 1,
    });
    await repos.vehicles.delete(van.id);
    expect((await repos.entries.list()).items).toHaveLength(1);
    expect(await repos.vehicleExternalCosts.listForVehicle(van.id)).toHaveLength(1);
  });

  it('refuses a cost for a vehicle that does not exist', async () => {
    await expect(repos.vehicleExternalCosts.create(cost({ vehicleId: 'nope' }))).rejects.toThrow();
  });

  it('is included in the backup', async () => {
    const { van } = await seed();
    await repos.vehicleExternalCosts.create(cost({ vehicleId: van.id }));
    const backup = await repos.backup.exportData('test');
    expect(backup.tables.vehicle_external_costs).toHaveLength(1);
  });
});
