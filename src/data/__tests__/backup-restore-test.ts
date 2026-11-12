/**
 * Prova de restauro (fase de validação, 2026-11-12): uma instalação com todos os tipos de dados,
 * cópia exportada como ficheiro (texto JSON), instalação limpa, restauro e comparação tabela a
 * tabela, coluna a coluna. Depois, restauro por cima de dados existentes.
 */
import { parseBackup } from '@/core/backup';
import type { SqlDatabase } from '@/data/db/sql-database';
import { LATEST_SCHEMA_VERSION } from '@/data/db/migrations';
import type { Repositories } from '@/data/repositories/types';
import { SYNC_COLUMNS, SYNC_ENTITIES } from '@/data/sqlite/sync-store';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';

async function snapshot(db: SqlDatabase) {
  const out: Record<string, unknown[]> = {};
  for (const table of SYNC_ENTITIES) {
    out[table] = await db.all(
      `SELECT ${SYNC_COLUMNS[table].join(', ')} FROM ${table} WHERE deleted_at IS NULL ORDER BY id`,
    );
  }
  return out;
}

async function seedEverything(repos: Repositories) {
  const bank = await repos.accounts.create({
    name: 'Banco',
    type: 'bank',
    currency: 'EUR',
    initialBalance: 100000,
  });
  const usd = await repos.accounts.create({
    name: 'Wise USD',
    type: 'bank',
    currency: 'USD',
    initialBalance: 5000,
  });
  const card = await repos.accounts.create({
    name: 'Visa',
    type: 'card',
    currency: 'EUR',
    initialBalance: -20000,
    creditLimit: 150000,
    dueDay: 5,
    paymentAccountId: bank.id,
  });
  const food = await repos.categories.create({
    name: 'Comida',
    type: 'expense',
    icon: 'cart',
    color: 'green',
  });
  const car = await repos.categories.create({
    name: 'Carro',
    type: 'expense',
    icon: 'car',
    color: 'blue',
  });
  const salary = await repos.categories.create({
    name: 'Salário',
    type: 'income',
    icon: 'briefcase',
    color: 'blue',
  });
  await repos.categories.reorder(
    'expense',
    (await repos.categories.list('expense')).map((c) => c.id).reverse(),
  );
  await repos.budgets.create({
    categoryId: food.id,
    amount: 30000,
    currency: 'EUR',
    period: 'monthly',
    startsOn: '2026-11-01',
  });
  await repos.subscriptions.create({
    name: 'Música',
    amount: 999,
    currency: 'EUR',
    period: 'monthly',
    status: 'active',
    startsOn: '2026-01-10',
    nextOn: '2026-12-10',
    categoryId: food.id,
  });
  await repos.entries.create({
    type: 'income',
    amount: 200000,
    description: 'Ordenado',
    categoryId: salary.id,
    accountId: bank.id,
    destinationAccountId: null,
    date: '2026-11-01',
    notes: 'novembro',
  });
  await repos.entries.create({
    type: 'expense',
    amount: 1250,
    description: 'Almoço com acentos ção',
    categoryId: food.id,
    accountId: card.id,
    destinationAccountId: null,
    date: '2026-11-03',
    notes: null,
  });
  await repos.entries.create({
    type: 'expense',
    amount: 700,
    description: 'Lunch',
    categoryId: food.id,
    accountId: usd.id,
    destinationAccountId: null,
    date: '2026-11-04',
    notes: null,
  });
  const transfer = await repos.entries.create({
    type: 'transfer',
    amount: 20000,
    description: 'Pagar cartão',
    categoryId: null,
    accountId: bank.id,
    destinationAccountId: card.id,
    date: '2026-11-05',
    notes: null,
  });
  const goal = await repos.goals.create({
    name: 'Férias',
    targetAmount: 200000,
    currency: 'EUR',
    targetOn: '2027-07-01',
    icon: 'airplane-outline',
    color: 'indigo',
    description: 'Japão',
    accountId: bank.id,
  });
  await repos.goals.addContribution({
    goalId: goal.id,
    amount: 20000,
    date: '2026-11-05',
    entryId: transfer.id,
  });
  await repos.goals.addContribution({ goalId: goal.id, amount: 5000, date: '2026-11-06' });
  const loan = await repos.wealth.create({
    name: 'Crédito',
    type: 'loan',
    amount: 1000000,
    currency: 'EUR',
    valuedOn: '2026-11-01',
  });
  await repos.wealth.recordPayment(loan.id, {
    amount: 30000,
    principal: 25000,
    interest: 4000,
    fees: 1000,
    accountId: bank.id,
    categoryId: car.id,
    date: '2026-11-08',
    description: 'Prestação',
  });
  await repos.wealth.create({
    name: 'ETF',
    type: 'investment',
    amount: 250000,
    currency: 'EUR',
    valuedOn: '2026-11-10',
  });
  const van = await repos.vehicles.create({
    name: 'Carrinha',
    kind: 'van',
    plate: '12-AB-34',
    odometerKm: 120000,
    inspectionDue: '2027-01-15',
    insuranceDue: null,
  });
  await repos.entries.create({
    type: 'expense',
    amount: 6500,
    description: 'Gasóleo',
    categoryId: car.id,
    accountId: bank.id,
    destinationAccountId: null,
    date: '2026-11-09',
    notes: null,
    vehicleId: van.id,
    vehicleCostType: 'fuel',
    quantityMilli: 40000,
    odometerKm: 120500,
  });
  await repos.documents.create({
    title: 'Seguro',
    category: 'insurance',
    expiresOn: '2027-03-01',
    notes: null,
    vehicleId: van.id,
    attachments: [
      {
        id: 'att-1',
        name: 'apolice.pdf',
        mime: 'application/pdf',
        size: 1234,
        createdAt: '2026-11-10T10:00:00.000Z',
      },
    ],
  });
}

describe('backup and restore (validation)', () => {
  it('restores every table, column, relation and amount into a clean installation', async () => {
    const source = await openTestRepositories();
    await seedEverything(source.repos);
    const before = await snapshot(source.db);
    const balancesBefore = await source.repos.accounts.listWithBalances();

    // Como um ficheiro: texto JSON, lido e verificado do zero.
    const text = JSON.stringify(await source.repos.backup.exportData('0.1.17'));
    const checked = parseBackup(text, LATEST_SCHEMA_VERSION);
    if (!checked.ok) throw new Error(checked.reason);
    expect(checked.backup.attachments).toEqual([
      { documentId: expect.any(String), name: 'apolice.pdf', size: 1234 },
    ]);

    const clean = await openTestRepositories();
    const preview = await clean.repos.backup.planRestore(checked.backup);
    const expectedRows = Object.values(before).reduce((total, rows) => total + rows.length, 0);
    expect(preview.totalInsert).toBe(expectedRows);
    await clean.repos.backup.applyRestore(checked.backup);

    // Igual, coluna a coluna (ids, valores, datas, moedas, relações e posições).
    expect(await snapshot(clean.db)).toEqual(before);
    expect(await clean.repos.accounts.listWithBalances()).toEqual(balancesBefore);
    const fk = await clean.db.all('PRAGMA foreign_key_check');
    expect(fk).toEqual([]);
    // A cópia restaurada segue para a sincronização como escritas normais.
    const outbox = await clean.db.first<{ n: number }>('SELECT count(*) AS n FROM sync_outbox');
    expect(outbox?.n ?? 0).toBeGreaterThanOrEqual(0);

    // Restaurar a mesma cópia outra vez não duplica nada.
    const again = await clean.repos.backup.applyRestore(checked.backup);
    expect(again.totalInsert + again.totalUpdate).toBe(0);
    expect(await snapshot(clean.db)).toEqual(before);
    await source.db.close();
    await clean.db.close();
  });

  it('merges into an installation that already has data without duplicates or silent overwrites', async () => {
    const source = await openTestRepositories();
    await seedEverything(source.repos);
    const backup = await source.repos.backup.exportData('0.1.17');

    // Destino: começou da mesma cópia, depois mudou umas coisas e criou outras.
    const target = await openTestRepositories();
    await target.repos.backup.applyRestore(backup);
    const [bank] = await target.repos.accounts.list();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await target.repos.accounts.update(bank!.id, {
      name: 'Banco renomeado',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 100000,
    });
    const extra = await target.repos.categories.create({
      name: 'Nova',
      type: 'expense',
      icon: 'star',
      color: 'red',
    });
    const [entry] = (await target.repos.entries.list({})).items;
    await target.repos.entries.delete(entry!.id);

    const plan = await target.repos.backup.applyRestore(backup);
    expect(plan.totalInsert).toBe(0); // nada em falta: nada é duplicado
    expect(plan.totalUpdate).toBe(0); // o que mudou aqui é mais recente: fica
    expect(plan.keptDeleted).toBe(1); // o que foi apagado aqui não volta sozinho
    expect((await target.repos.accounts.get(bank!.id))?.name).toBe('Banco renomeado');
    expect(await target.repos.categories.get(extra.id)).not.toBeNull();
    expect(await target.repos.entries.get(entry!.id)).toBeNull();
    await source.db.close();
    await target.db.close();
  });
});
