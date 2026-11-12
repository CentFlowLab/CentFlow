/**
 * Integridade financeira (fase de validação, 2026-11-12): cenários com dados conhecidos e o
 * resultado esperado calculado à mão, contra SQLite real. Cada número tem a conta ao lado.
 */
import { netWorthSummary, type Account, type Category } from '@/core/finance';
import type { SqlDatabase } from '@/data/db/sql-database';
import type { Repositories } from '@/data/repositories/types';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';

let db: SqlDatabase;
let repos: Repositories;
let bank: Account;
let cash: Account;
let food: Category;
let fees: Category;
let salary: Category;
let refunds: Category;

const NOV = { from: '2026-11-01', to: '2026-11-30' };

beforeEach(async () => {
  ({ db, repos } = await openTestRepositories());
  bank = await repos.accounts.create({
    name: 'Banco',
    type: 'bank',
    currency: 'EUR',
    initialBalance: 100000,
  });
  cash = await repos.accounts.create({
    name: 'Carteira',
    type: 'cash',
    currency: 'EUR',
    initialBalance: 10000,
  });
  food = await repos.categories.create({
    name: 'Comida',
    type: 'expense',
    icon: 'cart',
    color: 'green',
  });
  fees = await repos.categories.create({
    name: 'Juros e comissões',
    type: 'expense',
    icon: 'cash',
    color: 'red',
  });
  salary = await repos.categories.create({
    name: 'Salário',
    type: 'income',
    icon: 'briefcase',
    color: 'blue',
  });
  refunds = await repos.categories.create({
    name: 'Reembolsos',
    type: 'income',
    icon: 'refresh',
    color: 'teal',
  });
});

afterEach(() => db.close());

const balances = async () =>
  Object.fromEntries(
    (await repos.accounts.listWithBalances({ includeArchived: true })).map((a) => [
      a.name,
      a.balance,
    ]),
  );
const totals = async () => {
  const rows = await repos.entries.aggregate(NOV);
  const sum = (type: 'income' | 'expense') =>
    rows.filter((row) => row.type === type).reduce((total, row) => total + row.amount, 0);
  return { income: sum('income'), expense: sum('expense') };
};
const entry = (over: Record<string, unknown>) => ({
  type: 'expense' as const,
  amount: 0,
  description: '',
  categoryId: food.id,
  accountId: bank.id,
  destinationAccountId: null,
  date: '2026-11-10',
  notes: null,
  ...over,
});

describe('accounts and entries', () => {
  it('keeps balances and monthly totals exact through create, edit, delete, transfer and import', async () => {
    await repos.entries.create(entry({ type: 'income', amount: 200000, categoryId: salary.id }));
    const lunch = await repos.entries.create(entry({ amount: 1250 }));
    const dropped = await repos.entries.create(entry({ amount: 999 }));
    await repos.entries.create(
      entry({ type: 'transfer', amount: 5000, categoryId: null, destinationAccountId: cash.id }),
    );
    await repos.entries.update(lunch.id, entry({ amount: 2000 })); // 12,50 → 20,00
    await repos.entries.delete(dropped.id); // anulado: deixa de contar
    await repos.entries.createMany([
      entry({ amount: 300, description: 'Café', accountId: cash.id }),
      entry({ type: 'income', amount: 1500, categoryId: refunds.id }),
    ]);

    // Banco: 1000 + 2000 − 20 − 50 (transferência) + 15 = 2945,00
    // Carteira: 100 + 50 − 3 = 147,00
    expect(await balances()).toEqual({ Banco: 294500, Carteira: 14700 });
    // Rendimentos 2000 + 15; despesas 20 + 3; a transferência não é nem uma coisa nem outra.
    expect(await totals()).toEqual({ income: 201500, expense: 2300 });
  });
});

describe('credit card', () => {
  it('counts purchases and charges once, treats payments as transfers and tracks available credit', async () => {
    const card = await repos.accounts.create({
      name: 'Visa',
      type: 'card',
      currency: 'EUR',
      initialBalance: -65000, // já devia 650 € (abertura, não despesa)
      creditLimit: 200000,
    });
    await repos.entries.create(entry({ amount: 24000, accountId: card.id })); // compra 240
    await repos.entries.create(entry({ amount: 310, accountId: card.id, categoryId: fees.id })); // juros 3,10
    await repos.entries.create(entry({ amount: 150, accountId: card.id, categoryId: fees.id })); // comissão 1,50
    // Reembolso/estorno de uma compra: entra no cartão e baixa a dívida.
    await repos.entries.create(
      entry({ type: 'income', amount: 4000, accountId: card.id, categoryId: refunds.id }),
    );
    // Pagamento parcial (transferência do banco para o cartão).
    await repos.entries.create(
      entry({ type: 'transfer', amount: 30000, categoryId: null, destinationAccountId: card.id }),
    );

    // Dívida: 650 + 240 + 3,10 + 1,50 − 40 − 300 = 554,60
    let all = await balances();
    expect(all.Visa).toBe(-55460);
    expect(all.Banco).toBe(100000 - 30000);
    // Despesas do mês: só a compra, os juros e a comissão; o pagamento não é despesa nova.
    expect(await totals()).toEqual({ income: 4000, expense: 24000 + 310 + 150 });
    const status = (await repos.accounts.listWithBalances()).find((a) => a.id === card.id)!;
    expect(status.creditLimit).toBe(200000);
    expect(status.creditLimit! + status.balance).toBe(200000 - 55460); // disponível 1445,40

    // Pagamento total: a dívida fica a zero e o banco paga exatamente o que faltava.
    await repos.entries.create(
      entry({ type: 'transfer', amount: 55460, categoryId: null, destinationAccountId: card.id }),
    );
    all = await balances();
    expect(all.Visa).toBe(0);
    expect(all.Banco).toBe(100000 - 30000 - 55460);
    expect(await totals()).toEqual({ income: 4000, expense: 24460 });

    // Património: a dívida do cartão conta uma vez e o limite nunca conta.
    const summary = netWorthSummary(await repos.accounts.listWithBalances(), [], 'EUR');
    expect(summary).toMatchObject({ cardDebt: 0, available: 100000 - 85460 + 10000, debt: 0 });
  });
});

describe('loans', () => {
  it('separates cash out, principal repaid and financial cost, and closes at zero', async () => {
    const loan = await repos.wealth.create({
      name: 'Crédito auto',
      type: 'loan',
      amount: 2000000, // dívida de abertura 20 000 €
      currency: 'EUR',
      valuedOn: '2026-11-01',
    });
    // Prestação normal: 300 € = 250 capital + 40 juros + 10 encargos.
    await repos.wealth.recordPayment(loan.id, {
      amount: 30000,
      principal: 25000,
      interest: 4000,
      fees: 1000,
      accountId: bank.id,
      categoryId: fees.id,
      date: '2026-11-05',
      description: 'Prestação',
    });
    // Amortização extraordinária: 1000 € só de capital.
    await repos.wealth.recordPayment(loan.id, {
      amount: 100000,
      principal: 100000,
      interest: 0,
      fees: 0,
      accountId: cash.id === cash.id ? bank.id : bank.id,
      categoryId: fees.id,
      date: '2026-11-20',
      description: 'Amortização',
    });

    // Dívida: 20 000 − 250 − 1000 = 18 750; saída de dinheiro: 1300 €.
    expect((await repos.wealth.get(loan.id))?.amount).toBe(1875000);
    expect((await balances()).Banco).toBe(100000 - 130000);
    // Despesa do mês: só o custo financeiro (juros + encargos = 50 €). O capital amortizado
    // reduz a dívida, não é consumo (pedido da fase de validação).
    expect(await totals()).toEqual({ income: 0, expense: 5000 });
    // Orçamentos: o mesmo critério.
    const budgetSpend = (await repos.entries.listExpenses(NOV)).reduce(
      (s, row) => s + row.amount,
      0,
    );
    expect(budgetSpend).toBe(5000);

    // Pagar o resto fecha o empréstimo nesse dia.
    await repos.wealth.recordPayment(loan.id, {
      amount: 1875000,
      principal: 1875000,
      interest: 0,
      fees: 0,
      accountId: bank.id,
      categoryId: fees.id,
      date: '2026-11-28',
      description: 'Liquidação',
    });
    expect((await repos.wealth.get(loan.id))?.closedOn).toBe('2026-11-28');
    const summary = netWorthSummary(
      await repos.accounts.listWithBalances(),
      await repos.wealth.list(),
      'EUR',
    );
    expect(summary.debt).toBe(0);
  });
});

describe('net worth', () => {
  it('counts accounts, assets and debts once each', async () => {
    const card = await repos.accounts.create({
      name: 'Visa',
      type: 'card',
      currency: 'EUR',
      initialBalance: -10000,
    });
    await repos.wealth.create({
      name: 'Casa',
      type: 'property',
      amount: 20000000,
      currency: 'EUR',
      valuedOn: '2026-11-01',
    });
    await repos.wealth.create({
      name: 'ETF',
      type: 'investment',
      amount: 500000,
      currency: 'EUR',
      valuedOn: '2026-11-01',
    });
    await repos.wealth.create({
      name: 'Habitação',
      type: 'mortgage',
      amount: 15000000,
      currency: 'EUR',
      valuedOn: '2026-11-01',
    });
    // Um objetivo e as suas contribuições não mexem em nada disto.
    const goal = await repos.goals.create({
      name: 'Férias',
      targetAmount: 100000,
      currency: 'EUR',
      targetOn: null,
    });
    await repos.goals.addContribution({ goalId: goal.id, amount: 50000, date: '2026-11-10' });
    expect(card.id).toBeTruthy();

    const summary = netWorthSummary(
      await repos.accounts.listWithBalances(),
      await repos.wealth.list(),
      'EUR',
    );
    // Contas 1000 + 100; cartão −100 (dívida); bens 200 000 + 5000; hipoteca 150 000.
    expect(summary).toEqual({
      currency: 'EUR',
      available: 110000,
      cardDebt: 10000,
      invested: 500000,
      assets: 20500000,
      debt: 15010000,
      net: 110000 + 20500000 - 15010000,
    });
    expect(await balances()).toEqual({ Banco: 100000, Carteira: 10000, Visa: -10000 });
  });
});
