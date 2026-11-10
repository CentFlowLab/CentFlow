import {
  wealthTotals,
  computeBalances,
  DEFAULT_CATEGORIES,
  flowsFromEntries,
  savedAmountMinor,
  spentAmount,
  ValidationError,
  type Account,
  type Category,
  type EntryInput,
} from '@/core/finance';
import type { SqlDatabase } from '@/data/db/sql-database';
import { AccountInUseError, CategoryInUseError, NotFoundError } from '@/data/errors';
import type { DataEntity, Repositories } from '@/data/repositories/types';
import { createTempDirectory, openTestRepositories } from '@/test-utils/node-sqlite-driver';

let db: SqlDatabase;
let repos: Repositories;
let bank: Account;
let savings: Account;
let food: Category;
let salary: Category;

const baseExpense = (): EntryInput => ({
  type: 'expense',
  amount: 1250,
  description: 'Supermercado',
  categoryId: food.id,
  accountId: bank.id,
  destinationAccountId: null,
  date: '2026-11-08',
  notes: null,
});

beforeEach(async () => {
  ({ db, repos } = await openTestRepositories());
  bank = await repos.accounts.create({
    name: 'Banco',
    type: 'bank',
    currency: 'EUR',
    initialBalance: 100000,
  });
  savings = await repos.accounts.create({
    name: 'Poupança',
    type: 'savings',
    currency: 'EUR',
    initialBalance: 0,
  });
  food = await repos.categories.create({
    name: 'Alimentação',
    type: 'expense',
    icon: 'cart',
    color: 'green',
  });
  salary = await repos.categories.create({
    name: 'Salário',
    type: 'income',
    icon: 'briefcase',
    color: 'blue',
  });
});

afterEach(() => db.close());

async function balanceOf(id: string) {
  const accounts = await repos.accounts.listWithBalances({ includeArchived: true });
  return accounts.find((account) => account.id === id)?.balance;
}

describe('entries', () => {
  it('creates many entries in one transaction, or none when one is invalid', async () => {
    const income = { ...baseExpense(), type: 'income' as const, categoryId: salary.id };
    const created = await repos.entries.createMany([baseExpense(), { ...income, amount: 5000 }]);
    expect(created).toHaveLength(2);
    expect(await balanceOf(bank.id)).toBe(100000 - 1250 + 5000);

    // A segunda linha tem uma categoria de rendimento numa despesa: nada é gravado.
    const failure = repos.entries.createMany([
      baseExpense(),
      { ...baseExpense(), categoryId: salary.id },
    ]);
    await expect(failure).rejects.toMatchObject({ name: 'ValidationError', index: 1 });
    expect((await repos.entries.list()).total).toBe(2);
    expect(await balanceOf(bank.id)).toBe(100000 - 1250 + 5000);
  });

  it('creates an expense and lowers the account balance', async () => {
    const entry = await repos.entries.create(baseExpense());
    expect(entry).toMatchObject({ type: 'expense', amount: 1250, accountId: bank.id });
    expect(await repos.entries.get(entry.id)).toEqual(entry);
    expect(await balanceOf(bank.id)).toBe(98750);
  });

  it('creates an income and raises the account balance', async () => {
    await repos.entries.create({
      ...baseExpense(),
      type: 'income',
      categoryId: salary.id,
      amount: 250000,
    });
    expect(await balanceOf(bank.id)).toBe(350000);
  });

  it('moves money with a transfer without changing total wealth', async () => {
    await repos.entries.create({
      ...baseExpense(),
      type: 'transfer',
      categoryId: null,
      destinationAccountId: savings.id,
      amount: 30000,
    });
    expect(await balanceOf(bank.id)).toBe(70000);
    expect(await balanceOf(savings.id)).toBe(30000);
    const total = (await repos.accounts.listWithBalances()).reduce((sum, a) => sum + a.balance, 0);
    expect(total).toBe(100000);
  });

  it('rejects invalid entries with field errors and writes nothing', async () => {
    const attempts: Partial<EntryInput>[] = [
      { amount: 0 },
      { accountId: 'ghost' },
      { categoryId: null },
      { categoryId: salary.id },
      { type: 'transfer', categoryId: null, destinationAccountId: bank.id },
      { date: '2026-02-30' },
    ];
    for (const attempt of attempts) {
      await expect(repos.entries.create({ ...baseExpense(), ...attempt })).rejects.toBeInstanceOf(
        ValidationError,
      );
    }
    expect((await repos.entries.list()).total).toBe(0);
  });

  it('rejects transfers between currencies', async () => {
    const usd = await repos.accounts.create({
      name: 'USD',
      type: 'bank',
      currency: 'USD',
      initialBalance: 0,
    });
    await expect(
      repos.entries.create({
        ...baseExpense(),
        type: 'transfer',
        categoryId: null,
        destinationAccountId: usd.id,
      }),
    ).rejects.toMatchObject({ errors: { destinationAccountId: 'currencyMismatch' } });
  });

  it('edits an entry and recomputes balances', async () => {
    const entry = await repos.entries.create(baseExpense());
    const updated = await repos.entries.update(entry.id, {
      ...baseExpense(),
      type: 'transfer',
      categoryId: food.id, // limpo pela normalização
      destinationAccountId: savings.id,
      amount: 5000,
      description: '  Poupança mensal ',
    });
    expect(updated).toMatchObject({
      type: 'transfer',
      categoryId: null,
      amount: 5000,
      description: 'Poupança mensal',
    });
    expect(await repos.entries.get(entry.id)).toMatchObject({ type: 'transfer', amount: 5000 });
    expect(await balanceOf(bank.id)).toBe(95000);
    expect(await balanceOf(savings.id)).toBe(5000);
  });

  it('deletes an entry (tombstone) and restores the balance', async () => {
    const entry = await repos.entries.create(baseExpense());
    await repos.entries.delete(entry.id);
    expect(await repos.entries.get(entry.id)).toBeNull();
    expect(await balanceOf(bank.id)).toBe(100000);
    await expect(repos.entries.delete(entry.id)).rejects.toBeInstanceOf(NotFoundError);
    const tombstone = await db.first<{ deleted_at: string | null }>(
      'SELECT deleted_at FROM entries WHERE id = ?',
      [entry.id],
    );
    expect(tombstone?.deleted_at).toEqual(expect.any(String));
  });

  it('keeps an archived account on an existing entry when editing', async () => {
    const entry = await repos.entries.create(baseExpense());
    await repos.accounts.setArchived(bank.id, true);
    await expect(
      repos.entries.update(entry.id, { ...baseExpense(), amount: 999 }),
    ).resolves.toMatchObject({ amount: 999 });
    await expect(repos.entries.create(baseExpense())).rejects.toMatchObject({
      errors: { accountId: 'accountArchived' },
    });
  });

  describe('listing', () => {
    beforeEach(async () => {
      await repos.entries.create({
        ...baseExpense(),
        description: 'Café da manhã',
        date: '2026-11-01',
        amount: 150,
      });
      await repos.entries.create({
        ...baseExpense(),
        description: 'Jantar',
        date: '2026-11-15',
        amount: 4000,
      });
      await repos.entries.create({
        ...baseExpense(),
        type: 'income',
        categoryId: salary.id,
        description: 'Salário',
        date: '2026-10-28',
        amount: 200000,
      });
      await repos.entries.create({
        ...baseExpense(),
        type: 'transfer',
        categoryId: null,
        destinationAccountId: savings.id,
        description: '100% poupança_x',
        date: '2026-11-20',
        amount: 10000,
      });
    });

    const descriptions = (page: { items: { description: string }[] }) =>
      page.items.map((item) => item.description);

    it('sorts by date, newest first by default', async () => {
      expect(descriptions(await repos.entries.list())).toEqual([
        '100% poupança_x',
        'Jantar',
        'Café da manhã',
        'Salário',
      ]);
      expect(descriptions(await repos.entries.list({ sort: 'dateAsc' }))).toEqual([
        'Salário',
        'Café da manhã',
        'Jantar',
        '100% poupança_x',
      ]);
    });

    it('searches descriptions ignoring case and accents', async () => {
      expect(descriptions(await repos.entries.list({ search: 'CAFE' }))).toEqual(['Café da manhã']);
      expect(descriptions(await repos.entries.list({ search: 'manha' }))).toEqual([
        'Café da manhã',
      ]);
      expect((await repos.entries.list({ search: 'inexistente' })).total).toBe(0);
    });

    it('treats LIKE wildcards in the search as literal text', async () => {
      expect(descriptions(await repos.entries.list({ search: '%' }))).toEqual(['100% poupança_x']);
      expect(descriptions(await repos.entries.list({ search: '_x' }))).toEqual(['100% poupança_x']);
    });

    it('filters by type, category, account and period', async () => {
      expect((await repos.entries.list({ type: 'expense' })).total).toBe(2);
      expect((await repos.entries.list({ categoryId: salary.id })).total).toBe(1);
      expect(descriptions(await repos.entries.list({ accountId: savings.id }))).toEqual([
        '100% poupança_x',
      ]);
      expect(
        descriptions(await repos.entries.list({ from: '2026-11-01', to: '2026-11-15' })),
      ).toEqual(['Jantar', 'Café da manhã']);
      expect((await repos.entries.list({ type: 'expense', from: '2026-11-10' })).total).toBe(1);
    });

    it('paginates and reports the total', async () => {
      const page = await repos.entries.list({ limit: 2, offset: 1 });
      expect(descriptions(page)).toEqual(['Jantar', 'Café da manhã']);
      expect(page.total).toBe(4);
    });

    it('aggregates income and expenses by month and category, excluding transfers', async () => {
      expect(await repos.entries.aggregate({ from: '2026-10-01', to: '2026-11-30' })).toEqual([
        {
          month: '2026-10',
          currency: 'EUR',
          type: 'income',
          categoryId: salary.id,
          amount: 200000,
        },
        { month: '2026-11', currency: 'EUR', type: 'expense', categoryId: food.id, amount: 4150 },
      ]);
    });

    it('aggregates the same movements by day and still excludes transfers', async () => {
      expect(await repos.entries.aggregateByDate({ from: '2026-10-01', to: '2026-11-30' })).toEqual(
        [
          {
            date: '2026-10-28',
            currency: 'EUR',
            type: 'income',
            categoryId: salary.id,
            amount: 200000,
          },
          {
            date: '2026-11-01',
            currency: 'EUR',
            type: 'expense',
            categoryId: food.id,
            amount: 150,
          },
          {
            date: '2026-11-15',
            currency: 'EUR',
            type: 'expense',
            categoryId: food.id,
            amount: 4000,
          },
        ],
      );
    });
  });
});

describe('accounts', () => {
  it('computes balances that match the pure domain calculation', async () => {
    const card = await repos.accounts.create({
      name: 'Cartão',
      type: 'card',
      currency: 'EUR',
      initialBalance: -20000,
    });
    const inputs: EntryInput[] = [
      { ...baseExpense(), amount: 333 },
      { ...baseExpense(), accountId: card.id, amount: 4567 },
      { ...baseExpense(), type: 'income', categoryId: salary.id, amount: 180000 },
      {
        ...baseExpense(),
        type: 'transfer',
        categoryId: null,
        destinationAccountId: savings.id,
        amount: 25000,
      },
      {
        ...baseExpense(),
        type: 'transfer',
        categoryId: null,
        accountId: savings.id,
        destinationAccountId: card.id,
        amount: 5000,
      },
    ];
    for (const input of inputs) await repos.entries.create(input);
    const removed = await repos.entries.create({ ...baseExpense(), amount: 99999 });
    await repos.entries.delete(removed.id);

    const accounts = await repos.accounts.listWithBalances();
    const expected = computeBalances(accounts, flowsFromEntries(inputs));
    expect(
      accounts.map((a) => ({ accountId: a.id, currency: a.currency, balance: a.balance })),
    ).toEqual(expected);
    expect(accounts.find((a) => a.id === bank.id)?.balance).toBe(100000 - 333 + 180000 - 25000);
    expect(accounts.find((a) => a.id === card.id)?.balance).toBe(-20000 - 4567 + 5000);
    expect(accounts.find((a) => a.id === savings.id)?.balance).toBe(25000 - 5000);
    expect(accounts.find((a) => a.id === savings.id)?.entryCount).toBe(2);
  });

  it('updates fields and locks the currency once entries exist', async () => {
    await expect(
      repos.accounts.update(savings.id, {
        name: 'Reserva',
        type: 'savings',
        currency: 'usd',
        initialBalance: 500,
      }),
    ).resolves.toMatchObject({ name: 'Reserva', currency: 'USD' });
    await repos.entries.create(baseExpense());
    await expect(
      repos.accounts.update(bank.id, {
        name: 'Banco',
        type: 'bank',
        currency: 'USD',
        initialBalance: 0,
      }),
    ).rejects.toMatchObject({ errors: { currency: 'currencyLocked' } });
    await expect(
      repos.accounts.update(bank.id, {
        name: 'Banco X',
        type: 'bank',
        currency: 'EUR',
        initialBalance: 0,
      }),
    ).resolves.toMatchObject({ name: 'Banco X' });
  });

  it('archives and restores accounts', async () => {
    await repos.accounts.setArchived(savings.id, true);
    expect((await repos.accounts.list()).map((a) => a.id)).toEqual([bank.id]);
    expect((await repos.accounts.list({ includeArchived: true })).map((a) => a.id)).toEqual([
      bank.id,
      savings.id,
    ]);
    await repos.accounts.setArchived(savings.id, false);
    expect((await repos.accounts.list()).map((a) => a.id)).toEqual([bank.id, savings.id]);
  });

  it('refuses to delete an account with entries and offers safe alternatives', async () => {
    await repos.entries.create(baseExpense());
    await repos.entries.create({
      ...baseExpense(),
      type: 'transfer',
      categoryId: null,
      accountId: savings.id,
      destinationAccountId: bank.id,
      amount: 100,
    });
    await expect(repos.accounts.delete(bank.id)).rejects.toEqual(new AccountInUseError(2));
    expect(await repos.accounts.get(bank.id)).not.toBeNull();

    expect(await repos.accounts.deleteWithEntries(bank.id)).toBe(2);
    expect(await repos.accounts.get(bank.id)).toBeNull();
    expect((await repos.entries.list()).total).toBe(0);
    expect(await balanceOf(savings.id)).toBe(0);
  });

  it('deletes an account without entries', async () => {
    await repos.accounts.delete(savings.id);
    expect(await repos.accounts.get(savings.id)).toBeNull();
    await expect(
      repos.entries.create({ ...baseExpense(), accountId: savings.id }),
    ).rejects.toMatchObject({ errors: { accountId: 'accountNotFound' } });
  });

  it('validates input', async () => {
    await expect(
      repos.accounts.create({ name: ' ', type: 'bank', currency: 'EUR', initialBalance: 0 }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      repos.accounts.update('ghost', {
        name: 'X',
        type: 'bank',
        currency: 'EUR',
        initialBalance: 0,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('balance history', () => {
  it('follows retroactive corrections and deletions without stored snapshots', async () => {
    const old = await repos.entries.create({ ...baseExpense(), amount: 3000, date: '2026-08-10' });
    let { flows } = await repos.accounts.balanceHistory();
    expect(flows).toContainEqual({ accountId: bank.id, month: '2026-08', net: -3000 });
    await repos.entries.update(old.id, { ...baseExpense(), amount: 4500, date: '2026-07-10' });
    ({ flows } = await repos.accounts.balanceHistory());
    expect(flows).toContainEqual({ accountId: bank.id, month: '2026-07', net: -4500 });
    expect(flows.some((flow) => flow.month === '2026-08')).toBe(false);
    await repos.entries.delete(old.id);
    ({ flows } = await repos.accounts.balanceHistory());
    expect(flows.some((flow) => flow.month === '2026-07')).toBe(false);
  });

  it('returns month-end flows per account, with transfers on both sides', async () => {
    await repos.entries.create(baseExpense());
    await repos.entries.create({
      ...baseExpense(),
      type: 'transfer',
      amount: 5000,
      categoryId: null,
      destinationAccountId: savings.id,
      date: '2026-10-03',
    });
    await repos.entries.create({ ...baseExpense(), amount: 999, date: '2026-10-05' });
    const { accounts, flows } = await repos.accounts.balanceHistory();
    // A transferência de outubro é anterior à criação: a conta conta a partir daí.
    expect(accounts.find((account) => account.id === bank.id)).toMatchObject({
      initialBalance: 100000,
      since: '2026-10-03',
    });
    expect(flows).toEqual(
      expect.arrayContaining([
        { accountId: bank.id, month: '2026-11', net: -1250 },
        { accountId: bank.id, month: '2026-10', net: -5000 - 999 },
        { accountId: savings.id, month: '2026-10', net: 5000 },
      ]),
    );
  });
});

describe('categories', () => {
  it('marks expense categories as essential and never income ones', async () => {
    const rent = await repos.categories.create({
      name: 'Renda',
      type: 'expense',
      icon: 'home',
      color: 'blue',
      essential: true,
    });
    expect(rent.essential).toBe(true);
    // Sem o campo, a edição mantém a marca.
    const renamed = await repos.categories.update(rent.id, {
      name: 'Renda da casa',
      type: 'expense',
      icon: 'home',
      color: 'blue',
    });
    expect(renamed.essential).toBe(true);
    expect((await repos.categories.get(rent.id))?.essential).toBe(true);
    const income = await repos.categories.create({
      name: 'Prémio',
      type: 'income',
      icon: 'gift',
      color: 'green',
      essential: true,
    });
    expect(income.essential).toBe(false);
  });

  it('lists by type with usage counts', async () => {
    await repos.entries.create(baseExpense());
    const expenses = await repos.categories.listWithUsage('expense');
    expect(expenses.map((c) => [c.name, c.entryCount])).toEqual([['Alimentação', 1]]);
    expect((await repos.categories.list()).map((c) => c.name)).toEqual(['Alimentação', 'Salário']);
  });

  it('requires a reassignment target to delete a used category', async () => {
    const dining = await repos.categories.create({
      name: 'Restaurantes',
      type: 'expense',
      icon: 'pizza',
      color: 'orange',
    });
    const entry = await repos.entries.create(baseExpense());
    await expect(repos.categories.delete(food.id)).rejects.toEqual(new CategoryInUseError(1));
    await expect(repos.categories.delete(food.id, { reassignTo: salary.id })).rejects.toMatchObject(
      { errors: { categoryId: 'categoryTypeMismatch' } },
    );
    await expect(repos.categories.delete(food.id, { reassignTo: food.id })).rejects.toBeInstanceOf(
      ValidationError,
    );

    await repos.categories.delete(food.id, { reassignTo: dining.id });
    expect(await repos.categories.get(food.id)).toBeNull();
    expect((await repos.entries.get(entry.id))?.categoryId).toBe(dining.id);
    expect(await balanceOf(bank.id)).toBe(98750);
  });

  it('locks the type of a used category', async () => {
    await repos.entries.create(baseExpense());
    await expect(
      repos.categories.update(food.id, { name: 'X', type: 'income', icon: 'cart', color: 'green' }),
    ).rejects.toMatchObject({ errors: { type: 'typeLocked' } });
  });

  it('seeds default categories exactly once', async () => {
    const defaults = DEFAULT_CATEGORIES.map((category) => ({ ...category, name: category.key }));
    expect(await repos.categories.seedDefaults(defaults)).toBe(true);
    expect(await repos.categories.seedDefaults(defaults)).toBe(false);
    expect((await repos.categories.list()).length).toBe(2 + DEFAULT_CATEGORIES.length);
  });
});

describe('change notifications', () => {
  it('notifies after committed writes only', async () => {
    const events: (readonly DataEntity[])[] = [];
    const unsubscribe = repos.subscribe((entities) => events.push(entities));
    const entry = await repos.entries.create(baseExpense());
    await expect(repos.entries.create({ ...baseExpense(), amount: 0 })).rejects.toThrow();
    await repos.entries.delete(entry.id);
    unsubscribe();
    await repos.accounts.setArchived(savings.id, true);
    expect(events).toEqual([['entries'], ['entries']]);
  });
});

describe('budgets', () => {
  const input = () => ({
    categoryId: food.id,
    amount: 10_000,
    currency: 'EUR' as const,
    period: 'monthly' as const,
    startsOn: '2026-01-01',
  });

  it('creates, edits, rejects a second budget for the same category and deletes', async () => {
    const budget = await repos.budgets.create(input());
    expect(await repos.budgets.get(budget.id)).toEqual(budget);
    await expect(repos.budgets.create(input())).rejects.toMatchObject({
      errors: { categoryId: 'duplicateCategory' },
    });
    const updated = await repos.budgets.update(budget.id, {
      ...input(),
      amount: 8000,
      period: 'weekly',
    });
    expect(updated.amount).toBe(8000);
    expect(updated.period).toBe('weekly');
    await repos.budgets.delete(budget.id);
    expect(await repos.budgets.get(budget.id)).toBeNull();
    expect(await repos.budgets.list()).toEqual([]);
  });

  it('rejects an income category', async () => {
    await expect(repos.budgets.create({ ...input(), categoryId: salary.id })).rejects.toMatchObject(
      {
        errors: { categoryId: 'categoryTypeMismatch' },
      },
    );
  });

  it('removes the budget when its category is deleted', async () => {
    await repos.budgets.create(input());
    await repos.categories.delete(food.id);
    expect(await repos.budgets.list()).toEqual([]);
  });

  it('follows real expenses and ignores income, transfers, other currencies and other months', async () => {
    const usd = await repos.accounts.create({
      name: 'Dólares',
      type: 'cash',
      currency: 'USD',
      initialBalance: 0,
    });
    const rent = await repos.categories.create({
      name: 'Renda',
      type: 'expense',
      icon: 'home',
      color: 'indigo',
    });
    const range = { from: '2026-11-01', to: '2026-11-30' };
    const window = { start: range.from, end: range.to };
    await repos.entries.create(baseExpense());
    await repos.entries.create({
      ...baseExpense(),
      type: 'income',
      amount: 5000,
      categoryId: salary.id,
    });
    await repos.entries.create({
      type: 'transfer',
      amount: 700,
      description: 'Mover',
      categoryId: null,
      accountId: bank.id,
      destinationAccountId: savings.id,
      date: '2026-11-08',
      notes: null,
    });
    await repos.entries.create({ ...baseExpense(), amount: 4000, categoryId: rent.id });
    const foreign = await repos.entries.create({
      ...baseExpense(),
      amount: 9000,
      accountId: usd.id,
    });
    const edited = await repos.entries.create({
      ...baseExpense(),
      amount: 100,
      date: '2026-11-09',
    });
    await repos.entries.update(edited.id, { ...baseExpense(), amount: 300, date: '2026-11-09' });

    const november = await repos.entries.listExpenses(range);
    expect(spentAmount(november, { categoryId: food.id, currency: 'EUR' }, window)).toBe(1550);
    expect(spentAmount(november, { categoryId: food.id, currency: 'USD' }, window)).toBe(9000);

    await repos.entries.delete(foreign.id);
    await repos.entries.delete(edited.id);
    const after = await repos.entries.listExpenses(range);
    expect(spentAmount(after, { categoryId: food.id, currency: 'EUR' }, window)).toBe(1250);
    expect(spentAmount(after, { categoryId: food.id, currency: 'USD' }, window)).toBe(0);

    const december = await repos.entries.listExpenses({ from: '2026-12-01', to: '2026-12-31' });
    expect(
      spentAmount(
        december,
        { categoryId: food.id, currency: 'EUR' },
        {
          start: '2026-12-01',
          end: '2026-12-31',
        },
      ),
    ).toBe(0);
  });
});

describe('persistence', () => {
  it('keeps all data after closing and reopening the database file', async () => {
    const dir = createTempDirectory();
    const file = dir.file('centflow.db');
    try {
      const first = await openTestRepositories(file);
      const account = await first.repos.accounts.create({
        name: 'Banco',
        type: 'bank',
        currency: 'EUR',
        initialBalance: 1000,
      });
      const category = await first.repos.categories.create({
        name: 'Casa',
        type: 'expense',
        icon: 'home',
        color: 'indigo',
      });
      const entry = await first.repos.entries.create({
        ...baseExpense(),
        accountId: account.id,
        categoryId: category.id,
        amount: 1,
      });
      await first.db.close();

      const second = await openTestRepositories(file);
      expect(await second.repos.entries.get(entry.id)).toEqual(entry);
      expect(await second.repos.accounts.get(account.id)).toEqual(account);
      expect(await second.repos.categories.get(category.id)).toEqual(category);
      expect((await second.repos.accounts.listWithBalances())[0]?.balance).toBe(999);
      await second.db.close();
    } finally {
      dir.remove();
    }
  });
});

describe('subscriptions', () => {
  const input = () => ({
    name: 'Telefone',
    amount: 1500,
    currency: 'EUR' as const,
    period: 'monthly' as const,
    status: 'active' as const,
    startsOn: '2026-11-01',
    nextOn: '2026-12-01',
    categoryId: food.id,
  });

  it('creates, pauses and deletes without writing an entry', async () => {
    const created = await repos.subscriptions.create(input());
    expect(await repos.subscriptions.list()).toEqual([created]);
    const paused = await repos.subscriptions.update(created.id, { ...input(), status: 'paused' });
    expect(paused.status).toBe('paused');
    expect((await repos.entries.list()).total).toBe(0);
    await repos.subscriptions.delete(created.id);
    expect(await repos.subscriptions.get(created.id)).toBeNull();
  });

  it('remembers the previous price when the amount changes', async () => {
    const created = await repos.subscriptions.create(input());
    expect(created).toMatchObject({ previousAmount: null, amountChangedOn: null });
    const raised = await repos.subscriptions.update(created.id, {
      ...input(),
      amount: input().amount + 300,
    });
    expect(raised.previousAmount).toBe(input().amount);
    expect(raised.amountChangedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Mudar outra coisa mantém a última mudança de preço.
    const renamed = await repos.subscriptions.update(created.id, {
      ...input(),
      amount: input().amount + 300,
      name: 'Outro nome',
    });
    expect(renamed.previousAmount).toBe(input().amount);
    expect(await repos.subscriptions.get(created.id)).toEqual(renamed);
    // Noutra moeda, os valores não se comparam.
    const usd = await repos.subscriptions.update(created.id, { ...input(), currency: 'USD' });
    expect(usd).toMatchObject({ previousAmount: null, amountChangedOn: null });
  });

  it('rejects an income category and a next date before the start', async () => {
    await expect(
      repos.subscriptions.create({ ...input(), categoryId: salary.id }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      repos.subscriptions.create({ ...input(), categoryId: null, nextOn: '2026-10-01' }),
    ).rejects.toMatchObject({ errors: { nextOn: 'invalidDate' } });
  });
});

describe('savings goals', () => {
  it('sums active contributions and does not write an entry or a stored total', async () => {
    const goal = await repos.goals.create({
      name: 'Férias',
      targetAmount: 10000,
      currency: 'EUR',
      targetOn: '2026-12-01',
    });
    const first = await repos.goals.addContribution({
      goalId: goal.id,
      amount: 2500,
      date: '2026-11-01',
    });
    await repos.goals.addContribution({ goalId: goal.id, amount: 2500, date: '2026-11-08' });
    const contributions = await repos.goals.listContributions(goal.id);
    expect(savedAmountMinor(contributions.map((item) => item.amount))).toBe(5000);
    expect((await repos.entries.list()).total).toBe(0);
    const columns = await db.all<{ name: string }>(`PRAGMA table_info(goals)`);
    expect(columns.map((column) => column.name)).not.toContain('saved_amount');

    await repos.goals.deleteContribution(first.id);
    expect(
      savedAmountMinor((await repos.goals.listContributions(goal.id)).map((item) => item.amount)),
    ).toBe(2500);
    await expect(
      repos.goals.update(goal.id, { ...goal, currency: 'USD', targetOn: goal.targetOn }),
    ).rejects.toMatchObject({ errors: { currency: 'currencyLocked' } });

    await repos.goals.delete(goal.id);
    expect(await repos.goals.get(goal.id)).toBeNull();
    expect(await repos.goals.listContributions(goal.id)).toEqual([]);
  });

  it('sums progress in SQL without storing it on the goal', async () => {
    const goal = await repos.goals.create({
      name: 'Férias',
      targetAmount: 10000,
      currency: 'EUR',
      targetOn: null,
    });
    await repos.goals.addContribution({ goalId: goal.id, amount: 2500, date: '2026-10-01' });
    await repos.goals.addContribution({ goalId: goal.id, amount: 2500, date: '2026-11-08' });
    const [progress] = await repos.goals.progress({ from: '2026-11-01', to: '2026-11-30' });
    expect(progress).toMatchObject({
      id: goal.id,
      savedAmount: 5000,
      contributedInPeriod: 2500,
    });
    const columns = await db.all<{ name: string }>('PRAGMA table_info(goals)');
    expect(columns.map((column) => column.name)).not.toContain('saved_amount');
  });

  it('rejects a contribution for a missing goal and a non-positive amount', async () => {
    await expect(
      repos.goals.addContribution({
        goalId: '00000000-0000-4000-8000-000000000000',
        amount: 100,
        date: '2026-11-08',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    const goal = await repos.goals.create({
      name: 'Reserva',
      targetAmount: 100,
      currency: 'EUR',
      targetOn: null,
    });
    await expect(
      repos.goals.addContribution({ goalId: goal.id, amount: 0, date: '2026-11-08' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('wealth items', () => {
  it('closes a sold item (out of current totals, kept in history) and reopens it', async () => {
    const car = await repos.wealth.create({
      name: 'Carro',
      type: 'valuables',
      amount: 1_500_000,
      currency: 'EUR',
      valuedOn: '2026-01-10',
    });
    const closed = await repos.wealth.close(car.id, '2026-10-31');
    expect(closed.closedOn).toBe('2026-10-31');
    expect(wealthTotals(await repos.wealth.list())).toEqual([]);
    const reopened = await repos.wealth.reopen(car.id);
    expect(reopened.closedOn).toBeNull();
    await expect(repos.wealth.close(car.id, '2026-02-30')).rejects.toBeInstanceOf(ValidationError);
  });

  it('keeps the previous valuation when the value changes, not on a same-day correction', async () => {
    const house = await repos.wealth.create({
      name: 'Casa',
      type: 'property',
      amount: 20_000_000,
      currency: 'EUR',
      valuedOn: '2026-01-15',
    });
    expect(house.valueHistory).toEqual([]);
    const corrected = await repos.wealth.update(house.id, {
      name: 'Casa',
      type: 'property',
      amount: 19_500_000,
      currency: 'EUR',
      valuedOn: '2026-01-15',
    });
    expect(corrected.valueHistory).toEqual([]);
    const revalued = await repos.wealth.update(house.id, {
      name: 'Casa',
      type: 'property',
      amount: 21_000_000,
      currency: 'EUR',
      valuedOn: '2026-06-01',
    });
    expect(revalued.valueHistory).toEqual([{ amount: 19_500_000, valuedOn: '2026-01-15' }]);
    expect(await repos.wealth.get(house.id)).toEqual(revalued);
  });

  const input = {
    name: ' Casa ',
    type: 'property',
    amount: 20000000,
    currency: 'eur',
    valuedOn: '2026-11-08',
  } as const;

  it('creates, edits and soft-deletes an item without touching balances', async () => {
    const before = await repos.accounts.list();
    const item = await repos.wealth.create(input);
    expect(item).toMatchObject({ name: 'Casa', currency: 'EUR', type: 'property' });
    expect(await repos.wealth.list()).toHaveLength(1);

    const edited = await repos.wealth.update(item.id, {
      ...input,
      name: 'Casa nova',
      amount: 21000000,
    });
    expect(edited).toMatchObject({ name: 'Casa nova', amount: 21000000 });

    const after = await repos.accounts.list();
    expect(after).toEqual(before);

    await repos.wealth.delete(item.id);
    expect(await repos.wealth.get(item.id)).toBeNull();
    expect(await repos.wealth.list()).toEqual([]);
    await expect(repos.wealth.delete(item.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('validates input and notifies subscribers', async () => {
    await expect(repos.wealth.create({ ...input, amount: 0 })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(repos.wealth.create({ ...input, name: '  ' })).rejects.toBeInstanceOf(
      ValidationError,
    );
    const seen: (readonly DataEntity[])[] = [];
    repos.subscribe((entities) => seen.push(entities));
    await repos.wealth.create(input);
    expect(seen.flat()).toContain('wealth_items');
  });
});

describe('vehicles and documents', () => {
  const vehicle = {
    name: ' Carrinha ',
    kind: 'van',
    plate: ' 12-AB-34 ',
    odometerKm: 120000,
    inspectionDue: '2027-01-15',
    insuranceDue: null,
  } as const;

  it('creates, edits and deletes a vehicle, trimming text and keeping optional fields null', async () => {
    const created = await repos.vehicles.create(vehicle);
    expect(created).toMatchObject({ name: 'Carrinha', plate: '12-AB-34', insuranceDue: null });
    const edited = await repos.vehicles.update(created.id, {
      ...vehicle,
      plate: null,
      odometerKm: null,
    });
    expect(edited).toMatchObject({ plate: null, odometerKm: null });
    await repos.vehicles.delete(created.id);
    expect(await repos.vehicles.list()).toEqual([]);
    await expect(repos.vehicles.delete(created.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('validates vehicles and documents', async () => {
    await expect(repos.vehicles.create({ ...vehicle, name: ' ' })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(repos.vehicles.create({ ...vehicle, odometerKm: -5 })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      repos.documents.create({ title: '', category: 'tax', expiresOn: null, notes: null }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('creates, edits and deletes a document and notifies subscribers', async () => {
    const seen: (readonly DataEntity[])[] = [];
    repos.subscribe((entities) => seen.push(entities));
    const doc = await repos.documents.create({
      title: ' Cartão de cidadão ',
      category: 'identity',
      expiresOn: '2031-05-01',
      notes: ' renovar em abril ',
    });
    expect(doc).toMatchObject({ title: 'Cartão de cidadão', notes: 'renovar em abril' });
    const edited = await repos.documents.update(doc.id, {
      title: doc.title,
      category: 'identity',
      expiresOn: null,
      notes: null,
    });
    expect(edited).toMatchObject({ expiresOn: null, notes: null });
    await repos.documents.delete(doc.id);
    expect(await repos.documents.get(doc.id)).toBeNull();
    expect(seen.flat()).toEqual(expect.arrayContaining(['documents']));
  });
});
