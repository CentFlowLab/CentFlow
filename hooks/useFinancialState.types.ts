import type { FinancialState } from '@/lib/domain/financial/financial-state.types';

export type UseFinancialStateOptions = {
  referenceDate?: Date;
};

export type UseFinancialStateResult = {
  state: FinancialState | null;
  isLoading: boolean;
};
