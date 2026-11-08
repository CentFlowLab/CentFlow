import type { Account, Entry, Id } from './types';

/** Totais de movimentos de uma conta, em unidades mínimas (todos ≥ 0). */
export type AccountFlows = {
  income: number;
  expense: number;
  transferOut: number;
  transferIn: number;
};

export const EMPTY_FLOWS: AccountFlows = { income: 0, expense: 0, transferOut: 0, transferIn: 0 };

/**
 * Regras de saldo:
 * - rendimentos aumentam, despesas diminuem;
 * - transferências diminuem a origem e aumentam o destino;
 * - cada movimento conta uma única vez por conta envolvida.
 */
export function balanceFromFlows(initialBalance: number, flows: AccountFlows): number {
  const balance =
    initialBalance + flows.income - flows.expense - flows.transferOut + flows.transferIn;
  if (!Number.isSafeInteger(balance)) throw new RangeError('Balance exceeds safe integer range');
  return balance;
}

type FlowEntry = Pick<Entry, 'type' | 'amount' | 'accountId' | 'destinationAccountId'>;

/** Agrega movimentos (não eliminados) por conta. */
export function flowsFromEntries(entries: readonly FlowEntry[]): Map<Id, AccountFlows> {
  const flows = new Map<Id, AccountFlows>();
  const get = (id: Id) => {
    let value = flows.get(id);
    if (!value) {
      value = { ...EMPTY_FLOWS };
      flows.set(id, value);
    }
    return value;
  };

  for (const entry of entries) {
    if (entry.type === 'income') get(entry.accountId).income += entry.amount;
    else if (entry.type === 'expense') get(entry.accountId).expense += entry.amount;
    else if (entry.destinationAccountId) {
      get(entry.accountId).transferOut += entry.amount;
      get(entry.destinationAccountId).transferIn += entry.amount;
    }
  }
  return flows;
}

export type AccountBalance = {
  accountId: Id;
  currency: string;
  balance: number;
};

export function computeBalances(
  accounts: readonly Pick<Account, 'id' | 'currency' | 'initialBalance'>[],
  flowsByAccount: ReadonlyMap<Id, AccountFlows>,
): AccountBalance[] {
  return accounts.map((account) => ({
    accountId: account.id,
    currency: account.currency,
    balance: balanceFromFlows(
      account.initialBalance,
      flowsByAccount.get(account.id) ?? EMPTY_FLOWS,
    ),
  }));
}

/** Soma saldos por moeda (nunca mistura moedas). */
export function totalsByCurrency(balances: readonly AccountBalance[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const { currency, balance } of balances) {
    totals.set(currency, (totals.get(currency) ?? 0) + balance);
  }
  return totals;
}
