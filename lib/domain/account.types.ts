export type AccountType = 'checking' | 'savings' | 'investment' | 'wallet';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Corrente',
  savings: 'Poupança',
  investment: 'Investimento',
  wallet: 'Numerário',
};

export const ACCOUNT_COLOR_OPTIONS = [
  '#2DD4BF',
  '#38BDF8',
  '#A78BFA',
  '#F472B6',
  '#FBBF24',
  '#FB923C',
  '#4ADE80',
  '#94A3B8',
] as const;

export interface BankAccount {
  id: string;
  name: string;
  type: AccountType;
  bank?: string;
  color?: string;
  icon?: string;
  initialBalance: number;
  isActive: boolean;
  currency: string;
  createdAt?: string;
}

export type AccountWithBalance = BankAccount & {
  balance: number;
  monthDelta: number;
};

export type CreateAccountInput = {
  name: string;
  type: AccountType;
  bank?: string;
  color?: string;
  icon?: string;
  initialBalance?: number;
};

export type UpdateAccountInput = Partial<CreateAccountInput> & {
  isActive?: boolean;
};
