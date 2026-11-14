import {
  findCancellingPairs,
  findTransferCandidates,
  importedCategory,
  type Entry,
} from '@/core/finance';
import type { Repositories } from '@/data';
import { createMemoryStore } from '@/lib/storage/key-value-store';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';

import { importBankTransactions } from '../../features/banking/open-banking-client';

// ADR-082: importados por classificar; transferências só por ação da pessoa e só no mesmo dia.

const entry = (overrides: Partial<Entry>): Entry =>
  ({
    id: 'x',
    type: 'expense',
    amount: 100,
    date: '2026-11-13',
    accountId: 'a',
    needsReview: true,
    loanId: null,
    vehicleId: null,
    ...overrides,
  }) as Entry;
const accounts = [
  { id: 'a', currency: 'EUR', archivedAt: null },
  { id: 'b', currency: 'EUR', archivedAt: null },
  { id: 'u', currency: 'USD', archivedAt: null },
];

describe('core rules', () => {
  const categories = [
    { id: 'first', type: 'expense' as const },
    { id: 'income1', type: 'income' as const },
  ];

  it('marks imports to review in the fallback category, or applies a clear suggestion', () => {
    const history = [1, 2].map(() => ({
      description: 'Pingo Doce',
      type: 'expense' as const,
      categoryId: 'first',
      accountId: 'a',
      amount: 500,
      date: '2026-10-01',
    }));
    const row = { description: 'Pingo Doce', type: 'expense' as const };
    expect(importedCategory(row, history, categories, 'review')).toEqual({
      categoryId: 'first',
      needsReview: true,
    });
    expect(importedCategory(row, history, categories, 'suggest')).toEqual({
      categoryId: 'first',
      needsReview: false,
    });
    expect(
      importedCategory({ description: 'Novo', type: 'expense' }, history, categories, 'suggest'),
    ).toEqual({ categoryId: 'first', needsReview: true });
  });

  it('finds a transfer only between two own accounts, same currency, amount and day', () => {
    const out = entry({ id: 'o', accountId: 'a' });
    const into = entry({ id: 'i', type: 'income', accountId: 'b' });
    expect(findTransferCandidates([out, into], accounts)).toEqual([
      { expenseId: 'o', incomeId: 'i' },
    ]);
    const none = (list: Entry[]) => expect(findTransferCandidates(list, accounts)).toEqual([]);
    none([out, { ...into, accountId: 'a' }]); // mesma conta
    none([out, { ...into, date: '2026-11-14' }]); // outro dia
    none([out, { ...into, accountId: 'u' }]); // outra moeda
    none([out, { ...into, amount: 101 }]); // outro valor
    none([out, { ...into, needsReview: false }]); // já revisto
    none([out, { ...into, loanId: 'l' }]); // empréstimo
    none([{ ...out, vehicleId: 'v' }, into]); // viatura
  });

  it('only notes a pair that cancels out in the same account', () => {
    const out = entry({ id: 'o', accountId: 'a' });
    const back = entry({ id: 'i', type: 'income', accountId: 'a' });
    expect(findCancellingPairs([out, back], accounts)).toEqual([{ expenseId: 'o', incomeId: 'i' }]);
    expect(findTransferCandidates([out, back], accounts)).toEqual([]);
  });
});

describe('repository', () => {
  let db: Awaited<ReturnType<typeof openTestRepositories>>['db'];
  let repos: Repositories;
  beforeEach(async () => {
    ({ db, repos } = await openTestRepositories());
  });
  afterEach(() => db.close());

  async function seed() {
    const a = await repos.accounts.create({
      name: 'Banco A',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 10000,
    });
    const b = await repos.accounts.create({
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
    const otherIncome = await repos.categories.create({
      name: 'Outras receitas',
      type: 'income',
      icon: 'ellipsis-horizontal',
      color: 'gray',
    });
    const storage = createMemoryStore();
    const bank = (bankAccountId: string, appAccountId: string, type: 'income' | 'expense') =>
      importBankTransactions(
        repos,
        {
          bankAccountId,
          appAccountId,
          importFrom: '2026-11-01',
          transactions: [
            {
              id: null,
              date: '2026-11-13',
              amount: 100,
              currency: 'EUR',
              type,
              description: 'MB WAY',
            },
          ],
          fallbackDescription: 'Banco',
        },
        storage,
      );
    await bank('bank-a', a.id, 'expense');
    await bank('bank-b', b.id, 'income');
    return { a, b, other, otherIncome, bank };
  }

  const totals = async () => ({
    balances: (await repos.accounts.listWithBalances()).map((account) => account.balance),
    aggregate: await repos.entries.aggregate({ from: '2026-01-01', to: '2026-12-31' }),
  });

  it('filters, counts and marks as reviewed without changing any total', async () => {
    await seed();
    expect(await repos.entries.countNeedsReview()).toBe(2);
    const before = await totals();
    const { items } = await repos.entries.list({ needsReview: true });
    expect(items).toHaveLength(2);
    await repos.entries.markReviewed([items[0]!.id]);
    expect(await repos.entries.countNeedsReview()).toBe(1);
    expect(await totals()).toEqual(before);
  });

  it('classifies only with a category of the same type', async () => {
    const { otherIncome } = await seed();
    const [expense] = (await repos.entries.list({ type: 'expense' })).items;
    await expect(repos.entries.classify(expense!.id, otherIncome.id)).rejects.toThrow();
    const food = await repos.categories.create({
      name: 'Comida',
      type: 'expense',
      icon: 'cart',
      color: 'green',
    });
    const done = await repos.entries.classify(expense!.id, food.id);
    expect(done).toMatchObject({ categoryId: food.id, needsReview: false });
  });

  it('converts into one transfer, keeps balances, and a new bank read brings nothing back', async () => {
    const { a, b, bank } = await seed();
    const before = (await repos.accounts.listWithBalances()).map((account) => account.balance);
    const pair = findTransferCandidates(
      (await repos.entries.list()).items,
      await repos.accounts.list(),
    )[0]!;
    const transfer = await repos.entries.convertToTransfer(pair.expenseId, pair.incomeId);
    expect(transfer).toMatchObject({
      type: 'transfer',
      accountId: a.id,
      destinationAccountId: b.id,
      categoryId: null,
      needsReview: false,
    });
    expect((await repos.entries.list()).items).toHaveLength(1);
    expect((await repos.accounts.listWithBalances()).map((account) => account.balance)).toEqual(
      before,
    );
    // Sem despesa nem receita nos totais.
    expect(await repos.entries.aggregate({ from: '2026-01-01', to: '2026-12-31' })).toEqual([]);
    // Sem dupla contagem: as duas contas reconhecem a transferência como já existente.
    expect(await bank('bank-a', a.id, 'expense')).toBe(0);
    expect(await bank('bank-b', b.id, 'income')).toBe(0);
    expect((await repos.entries.list()).items).toHaveLength(1);
  });

  it('refuses a conversion that breaks a rule and leaves nothing half done', async () => {
    const { a } = await seed();
    const { items } = await repos.entries.list();
    const expense = items.find((item) => item.type === 'expense')!;
    const income = items.find((item) => item.type === 'income')!;
    await repos.entries.markReviewed([income.id]);
    await expect(repos.entries.convertToTransfer(expense.id, income.id)).rejects.toThrow();
    const after = (await repos.entries.list()).items;
    expect(after).toHaveLength(2);
    expect(after.find((item) => item.id === expense.id)).toMatchObject({
      type: 'expense',
      accountId: a.id,
    });
  });

  it('a manual entry is never to review, and saving an imported one reviews it', async () => {
    await seed();
    const [imported] = (await repos.entries.list({ type: 'expense' })).items;
    const saved = await repos.entries.update(imported!.id, {
      type: imported!.type,
      amount: imported!.amount,
      description: imported!.description,
      categoryId: imported!.categoryId,
      accountId: imported!.accountId,
      destinationAccountId: null,
      date: imported!.date,
      notes: null,
    });
    expect(saved.needsReview).toBe(false);
  });
});
