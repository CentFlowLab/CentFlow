import { createMemoryStore } from '@/lib/storage/key-value-store';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';

import { fetchSince, importBankTransactions, importCursor } from '../open-banking-client';

const tx = (
  date: string,
  amount: number,
  type: 'income' | 'expense',
  description = 'Pingo Doce',
) => ({ id: null, date, amount, currency: 'EUR', type, description });

describe('bank transactions import (ADR-069)', () => {
  it('imports only new movements since the link date, once, with the usual category', async () => {
    const { db, repos } = await openTestRepositories();
    const storage = createMemoryStore();
    const account = await repos.accounts.create({
      name: 'Revolut',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 100000,
    });
    const groceries = await repos.categories.create({
      name: 'Supermercado',
      type: 'expense',
      icon: 'cart',
      color: 'green',
    });
    await repos.categories.create({ name: 'Outros', type: 'expense', icon: 'cart', color: 'gray' });
    await repos.categories.create({
      name: 'Salário',
      type: 'income',
      icon: 'cash',
      color: 'green',
    });
    // Já registado à mão: não pode entrar outra vez.
    await repos.entries.create({
      type: 'expense',
      amount: 1230,
      description: 'Pingo Doce',
      categoryId: groceries.id,
      accountId: account.id,
      destinationAccountId: null,
      date: '2026-11-12',
      notes: null,
    });

    const transactions = [
      tx('2026-11-01', 5000, 'expense'), // antes da associação
      tx('2026-11-12', 1230, 'expense'), // igual ao registado
      tx('2026-11-12', 1230, 'expense'), // um segundo café igual no mesmo dia entra
      tx('2026-11-13', 150000, 'income', ''),
    ];
    const options = {
      bankAccountId: 'bank-1',
      appAccountId: account.id,
      importFrom: '2026-11-10',
      transactions,
      fallbackDescription: 'Revolut',
    };
    expect(await importBankTransactions(repos, options, storage)).toBe(2);
    // Repetir a mesma leitura não duplica nada.
    expect(await importBankTransactions(repos, options, storage)).toBe(0);

    const { items } = await repos.entries.list({ accountId: account.id });
    expect(items).toHaveLength(3);
    const imported = items.filter((item) => item.date >= '2026-11-12');
    expect(imported.map((item) => [item.date, item.type, item.amount, item.description])).toEqual(
      expect.arrayContaining([
        ['2026-11-12', 'expense', 1230, 'Pingo Doce'],
        ['2026-11-13', 'income', 150000, 'Revolut'],
      ]),
    );
    // ADR-082: por omissão, os importados ficam por classificar (o registado à mão não).
    expect(items.filter((item) => item.needsReview)).toHaveLength(2);
    expect(items.filter((item) => !item.needsReview)).toHaveLength(1);
    expect(await importCursor('bank-1', storage)).toBe('2026-11-13');
    await db.close();
  });

  it('applies a clear suggestion only in the "apply suggestions" mode', async () => {
    const { db, repos } = await openTestRepositories();
    const account = await repos.accounts.create({
      name: 'Moey',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 0,
    });
    const other = await repos.categories.create({
      name: 'Outras despesas',
      type: 'expense',
      icon: 'ellipsis-horizontal',
      color: 'gray',
    });
    const groceries = await repos.categories.create({
      name: 'Supermercado',
      type: 'expense',
      icon: 'cart',
      color: 'green',
    });
    for (const date of ['2026-10-01', '2026-10-08']) {
      await repos.entries.create({
        type: 'expense',
        amount: 2000,
        description: 'Pingo Doce',
        categoryId: groceries.id,
        accountId: account.id,
        destinationAccountId: null,
        date,
        notes: null,
      });
    }
    const options = (bankAccountId: string, date: string) => ({
      bankAccountId,
      appAccountId: account.id,
      importFrom: '2026-11-01',
      transactions: [tx(date, 999, 'expense')],
      fallbackDescription: 'Moey',
    });
    const review = createMemoryStore();
    await importBankTransactions(repos, options('b1', '2026-11-02'), review);
    const suggest = createMemoryStore({
      'preferences.v1': JSON.stringify({ importMode: 'suggest' }),
    });
    await importBankTransactions(repos, options('b2', '2026-11-03'), suggest);
    const { items } = await repos.entries.list({ from: '2026-11-01' });
    const byDate = new Map(items.map((item) => [item.date, item]));
    expect(byDate.get('2026-11-02')).toMatchObject({ categoryId: other.id, needsReview: true });
    expect(byDate.get('2026-11-03')).toMatchObject({
      categoryId: groceries.id,
      needsReview: false,
    });
    await db.close();
  });

  it('asks the bank from a week before the last import, never before the link or 90 days', () => {
    expect(fetchSince('2026-11-10', null, '2026-11-13')).toBe('2026-11-10');
    expect(fetchSince('2026-09-01', '2026-11-12', '2026-11-13')).toBe('2026-11-05');
    expect(fetchSince('2026-11-10', '2026-11-12', '2026-11-13')).toBe('2026-11-10');
    expect(fetchSince('2026-01-01', null, '2026-11-13')).toBe('2026-08-15');
  });
});
