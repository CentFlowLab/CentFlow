import type { SupabaseClient } from '@supabase/supabase-js';

import {
  BANK_HISTORY_DAYS,
  type BankAccountKind,
  type BankErrorCode,
  type BankTransaction,
} from '@/core/banking/open-banking';
import { addDays, importedCategory, type CalendarDate, type EntryInput } from '@/core/finance';
import { findLikelyDuplicates, type StatementRow } from '@/core/import';
import type { Repositories } from '@/data';
import { appStorage, type KeyValueStore } from '@/lib/storage/key-value-store';

import { existingMovements } from '../entries/existing-movements';
import { parsePreferences, PREFERENCES_STORAGE_KEY } from '../preferences/preferences';

/** Open banking na app (ADR-069). As chamadas ao banco passam todas pela Edge Function. */
const FUNCTION = 'open-banking';

export type BankAccountRow = {
  id: string;
  connection_id: string;
  name: string | null;
  kind: BankAccountKind | null;
  iban_last4: string | null;
  currency: string;
  balance: number | null;
  balance_at: string | null;
  app_account_id: string | null;
  import_from: CalendarDate | null;
};

export type BankConnection = {
  id: string;
  aspsp_name: string;
  aspsp_country: string;
  status: 'connected' | 'expired' | 'error';
  valid_until: string;
  last_sync_at: string | null;
  last_error: BankErrorCode | null;
  accounts: BankAccountRow[];
};

export type BankOption = { name: string; country: string; logo: string | null };

/** Erros que a app sabe explicar; o resto é `unavailable`. */
export type BankClientError = BankErrorCode | 'notConfigured' | 'tooSoon';

type Result<T> = { ok: true; value: T } | { ok: false; error: BankClientError };

const KNOWN: readonly BankClientError[] = [
  'unauthorized',
  'expired',
  'rateLimited',
  'unavailable',
  'invalid',
  'notConfigured',
  'tooSoon',
];

async function call<T>(client: SupabaseClient, body: Record<string, unknown>): Promise<Result<T>> {
  try {
    const { data, error } = await client.functions.invoke(FUNCTION, { method: 'POST', body });
    if (!error) return { ok: true, value: data as T };
    // O corpo do erro diz o código; sem ele (função não publicada, sem rede), indisponível.
    const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
    const parsed = (await context?.json?.().catch(() => null)) as { error?: unknown } | null;
    const code = parsed?.error;
    return {
      ok: false,
      error: KNOWN.includes(code as BankClientError) ? (code as BankClientError) : 'unavailable',
    };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

export function listBanks(client: SupabaseClient, country: string) {
  return call<{ banks: BankOption[] }>(client, { action: 'banks', country });
}

export function startBankLink(client: SupabaseClient, bank: BankOption, web: boolean) {
  return call<{ url: string }>(client, {
    action: 'start',
    bank: bank.name,
    country: bank.country,
    web,
  });
}

export function finishBankLink(client: SupabaseClient, code: string, state: string) {
  return call<{ connectionId: string }>(client, { action: 'finish', code, state });
}

export function disconnectBank(client: SupabaseClient, connectionId: string) {
  return call<{ ok: true }>(client, { action: 'disconnect', connectionId });
}

/** Ligações e contas desta pessoa (RLS); só as colunas que a app pode ler. */
export async function loadBankConnections(
  client: SupabaseClient,
): Promise<BankConnection[] | null> {
  try {
    const [connections, accounts] = await Promise.all([
      client
        .from('bank_connections')
        .select('id, aspsp_name, aspsp_country, status, valid_until, last_sync_at, last_error')
        .order('created_at'),
      client
        .from('bank_accounts')
        .select(
          'id, connection_id, name, kind, iban_last4, currency, balance, balance_at, app_account_id, import_from',
        )
        .order('created_at'),
    ]);
    if (connections.error || accounts.error) return null;
    const rows = (accounts.data ?? []) as BankAccountRow[];
    return ((connections.data ?? []) as Omit<BankConnection, 'accounts'>[]).map((connection) => ({
      ...connection,
      accounts: rows.filter((account) => account.connection_id === connection.id),
    }));
  } catch {
    return null;
  }
}

export async function linkBankAccount(
  client: SupabaseClient,
  bankAccountId: string,
  appAccountId: string | null,
  importFrom: CalendarDate | null,
): Promise<boolean> {
  const { error } = await client.rpc('bank_account_link', {
    p_id: bankAccountId,
    p_app_account: appAccountId,
    p_import_from: importFrom,
  });
  return !error;
}

/** Último dia já importado nesta conta bancária, neste aparelho (só para pedir menos ao banco). */
const cursorKey = (bankAccountId: string) => `bank:cursor:${bankAccountId}`;

export async function importCursor(
  bankAccountId: string,
  storage: KeyValueStore = appStorage,
): Promise<CalendarDate | null> {
  const value = await storage.getItem(cursorKey(bankAccountId)).catch(() => null);
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/**
 * Desde quando pedir movimentos: a data de associação, ou alguns dias antes do último importado
 * (os bancos contabilizam com atraso). Nunca antes da associação nem mais de 90 dias.
 */
export function fetchSince(
  importFrom: CalendarDate,
  cursor: CalendarDate | null,
  today: CalendarDate,
): CalendarDate {
  const floor = addDays(today, -BANK_HISTORY_DAYS);
  const start = cursor ? addDays(cursor, -7) : importFrom;
  const latest = [importFrom, floor, start].sort().at(-1)!;
  return latest;
}

/**
 * Regista os movimentos do banco na conta da app, como uma importação de extrato: só a partir da
 * data de associação, sem os que já existem (mesma data, valor e tipo) e com a categoria habitual
 * de cada descrição. Devolve quantos entraram.
 */
export async function importBankTransactions(
  repositories: Repositories,
  options: {
    bankAccountId: string;
    appAccountId: string;
    importFrom: CalendarDate;
    transactions: readonly BankTransaction[];
    fallbackDescription: string;
  },
  storage: KeyValueStore = appStorage,
): Promise<number> {
  const rows: StatementRow[] = options.transactions
    .filter((item) => item.date >= options.importFrom)
    .map((item, index) => ({
      line: index + 1,
      date: item.date,
      amount: item.amount,
      type: item.type,
      description: item.description || options.fallbackDescription,
    }));
  if (rows.length === 0) return 0;
  const existing = await existingMovements(repositories, options.appAccountId, rows);
  const duplicates = findLikelyDuplicates(rows, existing);
  const fresh = rows.filter((row) => !duplicates.has(row.line));
  let imported = 0;
  if (fresh.length > 0) {
    const [categories, history] = await Promise.all([
      repositories.categories.list(),
      repositories.entries.history({ since: '1900-01-01', limit: 5000 }),
    ]);
    // Por omissão entram "por classificar" em "Outras …" (ADR-082); com "Aplicar sugestões", a
    // sugestão clara do histórico. Nunca a primeira categoria da lista às cegas.
    const mode = parsePreferences(
      await storage.getItem(PREFERENCES_STORAGE_KEY).catch(() => null),
    ).importMode;
    const inputs: EntryInput[] = [];
    for (const row of fresh) {
      const { categoryId, needsReview } = importedCategory(row, history, categories, mode);
      // Sem nenhuma categoria desse tipo, o movimento não é válido: fica de fora.
      if (!categoryId) continue;
      inputs.push({
        type: row.type,
        amount: row.amount,
        description: row.description,
        categoryId,
        accountId: options.appAccountId,
        destinationAccountId: null,
        date: row.date,
        notes: null,
        needsReview,
      });
    }
    if (inputs.length > 0) await repositories.entries.createMany(inputs);
    imported = inputs.length;
  }
  const newest = rows
    .map((row) => row.date)
    .sort()
    .at(-1)!;
  await storage.setItem(cursorKey(options.bankAccountId), newest).catch(() => undefined);
  return imported;
}

type RefreshedAccount = { id: string; balance: number | null; transactions: BankTransaction[] };

/**
 * Lê saldos e movimentos de uma ligação e regista os movimentos novos nas contas associadas.
 * `force` ignora o intervalo mínimo (botão "Atualizar"); o servidor continua a limitar.
 */
export async function refreshBankConnection(
  client: SupabaseClient,
  repositories: Repositories,
  connection: BankConnection,
  today: CalendarDate,
  fallbackDescription: string,
  { force = false } = {},
): Promise<Result<{ imported: number }>> {
  const since: Record<string, CalendarDate> = {};
  for (const account of connection.accounts) {
    if (!account.app_account_id || !account.import_from) continue;
    since[account.id] = fetchSince(account.import_from, await importCursor(account.id), today);
  }
  const result = await call<{ accounts: RefreshedAccount[] }>(client, {
    action: 'refresh',
    connectionId: connection.id,
    since,
    force,
  });
  if (!result.ok) return result;
  let imported = 0;
  for (const refreshed of result.value.accounts ?? []) {
    const account = connection.accounts.find((item) => item.id === refreshed.id);
    if (!account?.app_account_id || !account.import_from) continue;
    // A conta da app pode ter sido eliminada neste aparelho: nesse caso não importa nada.
    if (!(await repositories.accounts.get(account.app_account_id))) continue;
    imported += await importBankTransactions(repositories, {
      bankAccountId: account.id,
      appAccountId: account.app_account_id,
      importFrom: account.import_from,
      transactions: refreshed.transactions ?? [],
      fallbackDescription,
    });
  }
  return { ok: true, value: { imported } };
}

/**
 * Põe o saldo de uma conta da app igual a `target` mudando só o saldo inicial (os movimentos ficam).
 * Usado ao associar uma conta do banco a uma conta que já existia e em "Saldo na app".
 * Devolve `false` se a conta não existir.
 */
export async function alignAccountBalance(
  repositories: Repositories,
  accountId: string,
  target: number,
): Promise<boolean> {
  const [account, withBalance] = await Promise.all([
    repositories.accounts.get(accountId),
    repositories.accounts.listWithBalances({ includeArchived: true }),
  ]);
  const current = withBalance.find((item) => item.id === accountId);
  if (!account || !current) return false;
  if (current.balance === target) return true;
  await repositories.accounts.update(account.id, {
    name: account.name,
    type: account.type,
    currency: account.currency,
    initialBalance: account.initialBalance + (target - current.balance),
    creditLimit: account.creditLimit,
    institution: account.institution,
    statementDay: account.statementDay,
    dueDay: account.dueDay,
    paymentAccountId: account.paymentAccountId,
    color: account.color,
  });
  return true;
}
