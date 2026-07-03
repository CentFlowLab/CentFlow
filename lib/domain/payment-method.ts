export type PaymentMethodKind = 'account' | 'card';

export type PaymentMethodSelection =
  | { kind: 'account'; id: string }
  | { kind: 'card'; id: string }
  | undefined;

export function paymentSelectionToFields(selection: PaymentMethodSelection): {
  accountId: string | null;
  creditId: string | null;
} {
  if (!selection) return { accountId: null, creditId: null };
  if (selection.kind === 'account') return { accountId: selection.id, creditId: null };
  return { accountId: null, creditId: selection.id };
}

export function fieldsToPaymentSelection(
  accountId?: string | null,
  creditId?: string | null,
): PaymentMethodSelection {
  if (creditId) return { kind: 'card', id: creditId };
  if (accountId) return { kind: 'account', id: accountId };
  return undefined;
}

export function resolveExpenseTransactionType(
  paymentMethod: PaymentMethodSelection,
): 'expense' | 'credit_card_purchase' {
  if (paymentMethod?.kind === 'card') return 'credit_card_purchase';
  return 'expense';
}
