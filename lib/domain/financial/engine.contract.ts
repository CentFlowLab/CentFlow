/**
 * Contrato financeiro único — entrada e saída do motor canónico.
 * Sem dependências de React, React Native ou Supabase.
 */
import type { BankAccount } from '@/lib/domain/account.types';
import type { Goal, Subscription } from '@/lib/domain/assets.types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { Credit, InventoryItem } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';

import type { FinancialState } from './financial-state.types';
import type { LoanPaymentRecord } from './loan-payments';

/** Entrada canónica — dados brutos + data de referência obrigatória em testes. */
export type FinancialEngineCoreInput = {
  transactions: Transaction[];
  accounts: BankAccount[];
  credits: Credit[];
  goals: Goal[];
  goalContributions: GoalContribution[];
  subscriptions: Subscription[];
  inventory: InventoryItem[];
  loanPayments: LoanPaymentRecord[];
  investments?: Array<{ id: string; name: string; currentValue: number; isActive?: boolean }>;
  /** Data de referência para cálculos (obrigatória em testes). */
  referenceDate: Date;
  currency?: string;
};

/**
 * Resultado canónico — espelha {@link FinancialState} com campos derivados explícitos.
 * Imutável por convenção (objetos não são congelados em runtime).
 */
export type FinancialEngineCoreResult = Readonly<FinancialState>;

/** Alias público — API principal do domínio financeiro. */
export type { CalculateFinancialStateInput } from './financial-state.types';
export type { FinancialState } from './financial-state.types';
