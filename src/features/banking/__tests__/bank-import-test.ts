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
    // A descrição já usada no Supermercado fica nessa categoria.
    expect(
      items.filter((item) => item.description === 'Pingo Doce').map((item) => item.categoryId),
    ).toEqual([groceries.id, groceries.id]);
    expect(await importCursor('bank-1', storage)).toBe('2026-11-13');
    await db.close();
  });

  it('asks the bank from a week before the last import, never before the link or 90 days', () => {
    expect(fetchSince('2026-11-10', null, '2026-11-13')).toBe('2026-11-10');
    expect(fetchSince('2026-09-01', '2026-11-12', '2026-11-13')).toBe('2026-11-05');
    expect(fetchSince('2026-11-10', '2026-11-12', '2026-11-13')).toBe('2026-11-10');
    expect(fetchSince('2026-01-01', null, '2026-11-13')).toBe('2026-08-15');
  });
});
