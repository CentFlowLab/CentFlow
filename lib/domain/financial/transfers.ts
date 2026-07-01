import type { BankAccount } from '@/lib/domain/account.types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { addMoney, roundMoney, subtractMoney } from './money';

export type TransferValidationResult =
  | { valid: true }
  | { valid: false; reason: 'same_account' | 'missing_account' | 'invalid_amount' | 'insufficient_balance' | 'not_enough_accounts' };

export function isTransferValid(input: {
  fromAccountId?: string | null;
  toAccountId?: string | null;
  amount: number;
  fromBalance: number;
  accountCount?: number;
}): TransferValidationResult {
  if ((input.accountCount ?? 2) < 2) {
    return { valid: false, reason: 'not_enough_accounts' };
  }
  if (!input.fromAccountId || !input.toAccountId) {
    return { valid: false, reason: 'missing_account' };
  }
  if (input.fromAccountId === input.toAccountId) {
    return { valid: false, reason: 'same_account' };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { valid: false, reason: 'invalid_amount' };
  }
  if (roundMoney(input.fromBalance) < roundMoney(input.amount)) {
    return { valid: false, reason: 'insufficient_balance' };
  }
  return { valid: true };
}

export function calculateTransferImpact(input: {
  fromAccount: Pick<BankAccount, 'name' | 'balance' | 'initialBalance'>;
  toAccount: Pick<BankAccount, 'name' | 'balance' | 'initialBalance'>;
  amount: number;
}): {
  fromBefore: number;
  fromAfter: number;
  toBefore: number;
  toAfter: number;
  totalBefore: number;
  totalAfter: number;
} | null {
  if (!Number.isFinite(input.amount) || input.amount <= 0) return null;

  const fromBefore = roundMoney(input.fromAccount.balance ?? input.fromAccount.initialBalance);
  const toBefore = roundMoney(input.toAccount.balance ?? input.toAccount.initialBalance);
  const fromAfter = subtractMoney(fromBefore, input.amount);
  const toAfter = addMoney(toBefore, input.amount);

  return {
    fromBefore,
    fromAfter,
    toBefore,
    toAfter,
    totalBefore: addMoney(fromBefore, toBefore),
    totalAfter: addMoney(fromAfter, toAfter),
  };
}

/** Total em contas não muda com transferências internas (desde que origem ≠ destino). */
export function assertTransferPreservesTotal(
  accounts: BankAccount[],
  transactions: Transaction[],
  transfer: Pick<Transaction, 'type' | 'amount' | 'accountId' | 'destinationAccountId'>,
): boolean {
  if (transfer.type !== 'transfer') return true;
  const before = roundMoney(
    accounts.reduce((sum, account) => addMoney(sum, account.balance ?? account.initialBalance), 0),
  );
  const afterAccounts = accounts.map((account) => {
    const delta = accountMovementDeltaForTransfer(transfer, account.id);
    return {
      ...account,
      balance: addMoney(account.balance ?? account.initialBalance, delta),
    };
  });
  const after = roundMoney(
    afterAccounts.reduce((sum, account) => addMoney(sum, account.balance ?? 0), 0),
  );
  return before === after;
}

function accountMovementDeltaForTransfer(
  tx: Pick<Transaction, 'amount' | 'accountId' | 'destinationAccountId'>,
  accountId: string,
): number {
  if (tx.accountId === accountId) return -tx.amount;
  if (tx.destinationAccountId === accountId) return tx.amount;
  return 0;
}

export function validationMessage(result: TransferValidationResult): string | null {
  if (result.valid) return null;
  switch (result.reason) {
    case 'not_enough_accounts':
      return 'Precisas de pelo menos duas contas para transferir dinheiro.';
    case 'same_account':
      return 'A conta de origem e destino têm de ser diferentes.';
    case 'missing_account':
      return 'Escolhe conta de origem e destino.';
    case 'invalid_amount':
      return 'Indica um valor válido maior que zero.';
    case 'insufficient_balance':
      return 'Saldo insuficiente nesta conta.';
    default:
      return null;
  }
}
