import AsyncStorage from '@react-native-async-storage/async-storage';

import type { T212Snapshot } from '@/core/investments/trading212';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';

import { linkedItemId, setLinkedItem, syncT212Wealth } from '../trading212-sync';

const snapshot = (total: number): T212Snapshot => ({
  currency: 'EUR',
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

beforeEach(() => AsyncStorage.clear());

describe('Trading 212 in net worth', () => {
  it('creates and links one item when there is no investment yet, then keeps it updated', async () => {
    const { db, repos } = await openTestRepositories();
    expect(await syncT212Wealth(repos, snapshot(631429), '2026-11-12', 'Trading 212')).toBe(
      'synced',
    );
    const [item] = await repos.wealth.list();
    expect(item).toMatchObject({ name: 'Trading 212', type: 'investment', amount: 631429 });
    expect(await linkedItemId()).toBe(item!.id);

    await syncT212Wealth(repos, snapshot(640000), '2026-11-13', 'Trading 212');
    const items = await repos.wealth.list();
    expect(items).toHaveLength(1); // nunca um segundo item
    expect(items[0]).toMatchObject({ amount: 640000, valuedOn: '2026-11-13' });
    await db.close();
  });

  it('does not guess when investments already exist, and respects "do not count"', async () => {
    const { db, repos } = await openTestRepositories();
    await repos.wealth.create({
      name: 'ETF',
      type: 'investment',
      amount: 100000,
      currency: 'EUR',
      valuedOn: '2026-11-01',
    });
    expect(await syncT212Wealth(repos, snapshot(631429), '2026-11-12', 'Trading 212')).toBe(
      'needsChoice',
    );
    expect(await repos.wealth.list()).toHaveLength(1);

    await setLinkedItem('none');
    expect(await syncT212Wealth(repos, snapshot(631429), '2026-11-12', 'Trading 212')).toBe(
      'notCounted',
    );
    expect((await repos.wealth.list())[0]?.amount).toBe(100000);
    await db.close();
  });
});
