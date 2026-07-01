export type AccountType = 'checking' | 'savings' | 'wallet' | 'investment' | 'other';

export type BankAccount = {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  color?: string;
  icon?: string;
  initialBalance: number;
  isActive: boolean;
  currency: string;
  /** Saldo calculado (inicial + movimentos ligados). */
  balance?: number;
};

export const ACCOUNT_TYPE_OPTIONS: Array<{ key: AccountType; label: string }> = [
  { key: 'checking', label: 'Conta à ordem' },
  { key: 'savings', label: 'Conta poupança' },
  { key: 'wallet', label: 'Carteira / digital' },
  { key: 'investment', label: 'Investimento' },
  { key: 'other', label: 'Outra conta' },
];

export function getAccountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPE_OPTIONS.find((option) => option.key === type)?.label ?? type;
}
