import { randomUUID } from 'node:crypto';

import { parseStartDaySetting } from '@/core/finance';
import {
  createTestServer,
  type ServerSession,
  type TestServer,
} from '@/test-utils/supabase-server';
import { createTestDevice, type TestDevice } from '@/test-utils/sync-device';

// ADR-079: definições da conta e associação das integrações vão pela fila normal de
// sincronização; a mesma conta vê o mesmo período em todos os aparelhos.
jest.setTimeout(60_000);

let server: TestServer;
const devices: TestDevice[] = [];

beforeAll(async () => {
  server = await createTestServer();
});
afterAll(async () => {
  await server.close();
});
afterEach(async () => {
  for (const device of devices.splice(0)) await device.close();
});

async function newUser(): Promise<ServerSession> {
  return server.createUser(randomUUID());
}
async function device(session: ServerSession, options?: Parameters<typeof createTestDevice>[1]) {
  const created = await createTestDevice(session, options);
  devices.push(created);
  return created;
}
const startDay = async (device: TestDevice) =>
  parseStartDaySetting(await device.repositories.settings.get('financial_month_start_day'));

describe('financial month start day across devices', () => {
  it('reaches the second device and stays independent per account', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    await phone.repositories.settings.set('financial_month_start_day', '25');
    await phone.engine.sync();
    await laptop.engine.sync();
    expect(await startDay(laptop)).toBe(25);

    const other = await device(await newUser());
    await other.engine.sync();
    expect(await startDay(other)).toBe(1);
  });

  it('keeps an offline change and sends it when the connection returns', async () => {
    const user = await newUser();
    const phone = await device(user);
    phone.transport.online = false;
    const laptop = await device(user);
    await phone.repositories.settings.set('financial_month_start_day', '10');
    await phone.engine.sync();
    expect(await startDay(phone)).toBe(10);
    phone.transport.online = true;
    await phone.engine.sync();
    await laptop.engine.sync();
    expect(await startDay(laptop)).toBe(10);
  });

  it('never replaces a choice silently: two different offline choices become a conflict', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    await phone.repositories.settings.set('financial_month_start_day', '25');
    await laptop.repositories.settings.set('financial_month_start_day', '5');
    await phone.engine.sync();
    const result = await laptop.engine.sync();
    expect(result.conflicts).toBe(1);
    // O servidor fica com a primeira escolha confirmada; a do portátil fica guardada no conflito.
    expect(await startDay(laptop)).toBe(25);
    const [conflict] = await laptop.engine.listConflicts();
    expect(conflict).toMatchObject({ entity: 'user_settings', local: { value: '5' } });
    await laptop.engine.resolveConflict(conflict!.id, 'keepLocal');
    await laptop.engine.sync();
    await phone.engine.sync();
    expect(await startDay(phone)).toBe(5);
    expect(await startDay(laptop)).toBe(5);
  });

  it('accepts the same choice made on two devices without a conflict', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    await phone.repositories.settings.set('financial_month_start_day', '25');
    await laptop.repositories.settings.set('financial_month_start_day', '25');
    await phone.engine.sync();
    expect((await laptop.engine.sync()).conflicts).toBe(0);
    expect(await startDay(laptop)).toBe(25);
  });
});

describe('Trading 212 link across devices', () => {
  it('syncs which net worth item belongs to the integration', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const item = await phone.repositories.wealth.create({
      name: 'Trading 212',
      type: 'investment',
      amount: 100000,
      currency: 'EUR',
      valuedOn: '2026-11-14',
      integration: 'trading212',
    });
    await phone.engine.sync();
    await laptop.engine.sync();
    expect(await laptop.repositories.wealth.get(item.id)).toMatchObject({
      integration: 'trading212',
    });
  });

  it('an edit from a device without the field keeps the link on the server', async () => {
    const user = await newUser();
    const phone = await device(user);
    const item = await phone.repositories.wealth.create({
      name: 'Trading 212',
      type: 'investment',
      amount: 100000,
      currency: 'EUR',
      valuedOn: '2026-11-14',
      integration: 'trading212',
    });
    await phone.engine.sync();
    // Como uma app 0.1.22: atualiza o item sem a chave `integration`.
    const [row] = await user.query<{ version: number }>(
      'select version from public.wealth_items where id = $1',
      [item.id],
    );
    await user.rpc('sync_push', {
      p_ops: [
        {
          op_id: randomUUID(),
          entity: 'wealth_items',
          record_id: item.id,
          base_version: row!.version,
          data: {
            name: 'Trading 212',
            type: 'investment',
            amount: 120000,
            currency: 'EUR',
            valued_on: '2026-11-15',
            deleted_at: null,
          },
        },
      ],
    });
    const [after] = await user.query<{ integration: string | null; amount: number }>(
      'select integration, amount from public.wealth_items where id = $1',
      [item.id],
    );
    expect(after).toEqual({ integration: 'trading212', amount: 120000 });
  });
});

describe('old clients (0.1.22)', () => {
  it('never receive the new entities through sync_pull_v2', async () => {
    const user = await newUser();
    const phone = await device(user);
    await phone.repositories.settings.set('financial_month_start_day', '25');
    await phone.engine.sync();
    const page = await user.rpc<{ changes: { entity: string }[] }>('sync_pull_v2', {
      p_since: 0,
      p_limit: 500,
    });
    expect(page.changes.map((change) => change.entity)).not.toContain('user_settings');
    const v3 = await user.rpc<{ changes: { entity: string }[] }>('sync_pull_v3', {
      p_since: 0,
      p_limit: 500,
    });
    expect(v3.changes.map((change) => change.entity)).toContain('user_settings');
  });
});

describe('vehicle costs paid by others across devices (ADR-081)', () => {
  async function vehicleOn(device: TestDevice) {
    return device.repositories.vehicles.create({
      name: 'Carrinha',
      kind: 'van',
      plate: null,
      odometerKm: null,
      inspectionDue: null,
      insuranceDue: null,
      currency: 'EUR',
      costsPaidBy: 'Nyah Lounge LDA',
    });
  }

  it('creates, edits and deletes a cost on another device, and isolates other users', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const van = await vehicleOn(phone);
    const cost = await phone.repositories.vehicleExternalCosts.create({
      vehicleId: van.id,
      date: '2026-11-10',
      amount: 6000,
      currency: 'EUR',
      costType: 'fuel',
      quantityMilli: 40000,
      odometerKm: null,
      description: 'Gasóleo',
      payer: 'Nyah Lounge LDA',
      notes: null,
    });
    await phone.engine.sync();
    await laptop.engine.sync();
    expect((await laptop.repositories.vehicles.get(van.id))?.costsPaidBy).toBe('Nyah Lounge LDA');
    expect(await laptop.repositories.vehicleExternalCosts.listForVehicle(van.id)).toEqual([
      expect.objectContaining({ id: cost.id, amount: 6000 }),
    ]);

    await laptop.repositories.vehicleExternalCosts.update(cost.id, {
      ...cost,
      amount: 6500,
    });
    await laptop.engine.sync();
    await phone.engine.sync();
    expect((await phone.repositories.vehicleExternalCosts.get(cost.id))?.amount).toBe(6500);

    await phone.repositories.vehicleExternalCosts.delete(cost.id);
    await phone.engine.sync();
    await laptop.engine.sync();
    expect(await laptop.repositories.vehicleExternalCosts.listForVehicle(van.id)).toEqual([]);

    const stranger = await newUser();
    expect(await stranger.query('select id from public.vehicle_external_costs')).toEqual([]);
    expect(await stranger.query('select id from public.user_settings')).toEqual([]);
  });

  it('an edit from an old app without costs_paid_by keeps the payer', async () => {
    const user = await newUser();
    const phone = await device(user);
    const van = await vehicleOn(phone);
    await phone.engine.sync();
    const [row] = await user.query<{ version: number }>(
      'select version from public.vehicles where id = $1',
      [van.id],
    );
    await user.rpc('sync_push', {
      p_ops: [
        {
          op_id: randomUUID(),
          entity: 'vehicles',
          record_id: van.id,
          base_version: row!.version,
          data: {
            name: 'Carrinha nova',
            kind: 'van',
            plate: null,
            odometer_km: null,
            inspection_due: null,
            insurance_due: null,
            deleted_at: null,
          },
        },
      ],
    });
    const [after] = await user.query<{ name: string; costs_paid_by: string | null }>(
      'select name, costs_paid_by from public.vehicles where id = $1',
      [van.id],
    );
    expect(after).toEqual({ name: 'Carrinha nova', costs_paid_by: 'Nyah Lounge LDA' });
  });
});

describe('entries to review across devices (ADR-082)', () => {
  it('syncs the flag and keeps it when an old app edits the entry', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const account = await phone.repositories.accounts.create({
      name: 'Banco',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 0,
    });
    const category = await phone.repositories.categories.create({
      name: 'Outras despesas',
      type: 'expense',
      icon: 'ellipsis-horizontal',
      color: 'gray',
    });
    const entry = await phone.repositories.entries.create({
      type: 'expense',
      amount: 990,
      description: 'Compra online',
      categoryId: category.id,
      accountId: account.id,
      destinationAccountId: null,
      date: '2026-11-13',
      notes: null,
      needsReview: true,
    });
    await phone.engine.sync();
    await laptop.engine.sync();
    expect((await laptop.repositories.entries.get(entry.id))?.needsReview).toBe(true);

    const [row] = await user.query<{ version: number }>(
      'select version from public.entries where id = $1',
      [entry.id],
    );
    await user.rpc('sync_push', {
      p_ops: [
        {
          op_id: randomUUID(),
          entity: 'entries',
          record_id: entry.id,
          base_version: row!.version,
          data: {
            type: 'expense',
            amount: 990,
            description: 'Compra online (editada)',
            notes: null,
            category_id: category.id,
            account_id: account.id,
            destination_account_id: null,
            date: '2026-11-13',
            deleted_at: null,
          },
        },
      ],
    });
    const [after] = await user.query<{ needs_review: boolean }>(
      'select needs_review from public.entries where id = $1',
      [entry.id],
    );
    expect(after).toEqual({ needs_review: true });
  });
});
