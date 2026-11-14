import AsyncStorage from '@react-native-async-storage/async-storage';

import type { T212Snapshot } from '@/core/investments/trading212';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';

import { chooseT212Item, readT212Link, syncT212Wealth, T212_LINK_KEY } from '../trading212-sync';

const snapshot = (total: number, currency = 'EUR'): T212Snapshot => ({
  currency,
  cashAvailable: 0,
  cashOther: 0,
  invested: total,
  cost: 500000,
  unrealized: total - 500000,
  realized: 0,
  total,
  positions: [],
  takenAt: '2026-11-12T22:00:00.000Z',
});

const investment = (name: string, amount: number, currency = 'EUR') => ({
  name,
  type: 'investment' as const,
  amount,
  currency,
  valuedOn: '2026-11-01',
});

beforeEach(() => AsyncStorage.clear());

// ADR-079: a integração só atualiza o item que lhe pertence (marcado e sincronizado); nunca apaga
// nem altera investimentos da pessoa por coincidirem no nome ou na moeda.
describe('Trading 212 in net worth', () => {
  it('creates one item owned by the integration when there is no investment, then keeps it updated', async () => {
    const { db, repos } = await openTestRepositories();
    expect(await syncT212Wealth(repos, snapshot(631429), '2026-11-12', 'Trading 212')).toBe(
      'synced',
    );
    const [item] = await repos.wealth.list();
    expect(item).toMatchObject({ name: 'Trading 212', amount: 631429, integration: 'trading212' });
    await syncT212Wealth(repos, snapshot(640000), '2026-11-13', 'Trading 212');
    expect(await repos.wealth.list()).toEqual([
      expect.objectContaining({ id: item!.id, amount: 640000, valuedOn: '2026-11-13' }),
    ]);
    db.close();
  });

  it('never touches a manual investment, even with the same name and currency', async () => {
    const { db, repos } = await openTestRepositories();
    const manual = await repos.wealth.create(investment('Trading 212', 100000));
    expect(await syncT212Wealth(repos, snapshot(631429), '2026-11-12', 'Trading 212')).toBe(
      'needsChoice',
    );
    expect(await repos.wealth.get(manual.id)).toMatchObject({
      amount: 100000,
      integration: null,
    });
    expect(await repos.wealth.list()).toHaveLength(1);
    db.close();
  });

  it('only updates the item that belongs to the integration and keeps every other one', async () => {
    const { db, repos } = await openTestRepositories();
    const manual = await repos.wealth.create(investment('Trading 212', 100000));
    const owned = await repos.wealth.create({
      ...investment('Conta T212', 200000),
      integration: 'trading212',
    });
    expect(await syncT212Wealth(repos, snapshot(250000), '2026-11-13', 'Trading 212')).toBe(
      'synced',
    );
    expect(await repos.wealth.get(manual.id)).toMatchObject({ amount: 100000 });
    expect(await repos.wealth.get(owned.id)).toMatchObject({ amount: 250000 });
    db.close();
  });

  it('does not choose nor delete when two devices linked different items', async () => {
    const { db, repos } = await openTestRepositories();
    const first = await repos.wealth.create({
      ...investment('Trading 212', 100000),
      integration: 'trading212',
    });
    const second = await repos.wealth.create({
      ...investment('Trading 212', 120000),
      integration: 'trading212',
    });
    expect(await syncT212Wealth(repos, snapshot(190000), '2026-11-13', 'Trading 212')).toBe(
      'ambiguous',
    );
    expect(await repos.wealth.get(first.id)).toMatchObject({ amount: 100000 });
    expect(await repos.wealth.get(second.id)).toMatchObject({ amount: 120000 });

    // A pessoa escolhe: o outro deixa de pertencer à integração e fica como investimento seu.
    await chooseT212Item(repos, second.id);
    expect(await readT212Link(repos)).toMatchObject({ status: 'linked', item: { id: second.id } });
    expect(await repos.wealth.get(first.id)).toMatchObject({ integration: null, amount: 100000 });
    expect(await syncT212Wealth(repos, snapshot(190000), '2026-11-13', 'Trading 212')).toBe(
      'synced',
    );
    expect(await repos.wealth.get(second.id)).toMatchObject({ amount: 190000 });
    expect(await repos.wealth.get(first.id)).toMatchObject({ amount: 100000 });
    db.close();
  });

  it('respects "do not count" and an explicit choice of an existing investment', async () => {
    const { db, repos } = await openTestRepositories();
    const existing = await repos.wealth.create(investment('Corretora', 50000));
    await chooseT212Item(repos, 'none');
    expect(await syncT212Wealth(repos, snapshot(631429), '2026-11-12', 'Trading 212')).toBe(
      'notCounted',
    );
    expect(await repos.wealth.get(existing.id)).toMatchObject({ amount: 50000 });
    await chooseT212Item(repos, existing.id);
    expect(await syncT212Wealth(repos, snapshot(70000), '2026-11-14', 'Trading 212')).toBe(
      'synced',
    );
    expect(await repos.wealth.get(existing.id)).toMatchObject({
      amount: 70000,
      integration: 'trading212',
    });
    db.close();
  });

  it('converts the old per-device link once, and ignores a deleted or closed item', async () => {
    const { db, repos } = await openTestRepositories();
    const linked = await repos.wealth.create(investment('Trading 212', 100000));
    await AsyncStorage.setItem(`centflow:${T212_LINK_KEY}`, linked.id);
    expect(await readT212Link(repos)).toMatchObject({ status: 'linked', item: { id: linked.id } });
    expect(await AsyncStorage.getItem(`centflow:${T212_LINK_KEY}`)).toBeNull();

    const { db: db2, repos: other } = await openTestRepositories();
    const gone = await other.wealth.create(investment('Antigo', 100000));
    await other.wealth.delete(gone.id);
    await AsyncStorage.setItem(`centflow:${T212_LINK_KEY}`, gone.id);
    expect(await readT212Link(other)).toEqual({ status: 'unlinked' });
    db.close();
    db2.close();
  });

  it('never converts currencies: an item in another currency is left as it is', async () => {
    const { db, repos } = await openTestRepositories();
    const owned = await repos.wealth.create({
      ...investment('Trading 212', 100000, 'USD'),
      integration: 'trading212',
    });
    expect(await syncT212Wealth(repos, snapshot(190000, 'EUR'), '2026-11-13', 'Trading 212')).toBe(
      'skipped',
    );
    expect(await repos.wealth.get(owned.id)).toMatchObject({ amount: 100000, currency: 'USD' });
    db.close();
  });
});
