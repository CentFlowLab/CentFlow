import type { Credit } from '@/lib/domain/types';

import { addMoney, roundMoney } from './money';

export function sumCreditLiabilities(credits: Credit[]): number {
  return roundMoney(credits.reduce((sum, credit) => addMoney(sum, credit.outstandingBalance), 0));
}

export function sumMonthlyDebtPayments(
  credits: Array<{ monthlyPayment?: number; nextPaymentAmount?: number }>,
): number {
  return roundMoney(
    credits.reduce(
      (sum, credit) => addMoney(sum, credit.nextPaymentAmount ?? credit.monthlyPayment ?? 0),
      0,
    ),
  );
}

export function debtToIncomeRatio(totalDebt: number, monthlyIncome: number): number | null {
  if (monthlyIncome <= 0) return null;
  return roundMoney(totalDebt / (monthlyIncome * 12));
}
