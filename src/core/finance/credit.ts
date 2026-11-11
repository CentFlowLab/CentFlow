import { toCalendarDate, type CalendarDate } from './dates';
import type { Account, Entry, Id, WealthItem } from './types';

/** Estado de um cartão de crédito (ADR-057). O limite nunca é dinheiro da pessoa. */
export type CardStatus = {
  limit: number | null;
  /** O que se deve: −saldo, quando negativo. */
  debt: number;
  /** Limite − dívida (negativo se acima do limite); `null` sem limite. */
  available: number | null;
  /** Dívida ÷ limite (pode passar de 1); `null` sem limite. */
  utilization: number | null;
  overLimit: boolean;
};

export function cardStatus(account: Pick<Account, 'creditLimit'>, balance: number): CardStatus {
  const debt = Math.max(0, -balance);
  const limit = account.creditLimit;
  if (limit === null || limit <= 0) {
    return { limit: null, debt, available: null, utilization: null, overLimit: false };
  }
  return {
    limit,
    debt,
    available: limit - debt,
    utilization: debt / limit,
    overLimit: debt > limit,
  };
}

/** Repartição de uma prestação: capital + juros + encargos = total pago. */
export type PaymentSplit = { principal: number; interest: number; fees: number };

/**
 * Sem juros nem encargos indicados, o que sobra do total depois do capital fica em encargos
 * ("juros e encargos por discriminar"). `null` se as partes não couberem no total.
 */
export function splitPayment(
  total: number,
  principal: number,
  interest?: number | null,
  fees?: number | null,
): PaymentSplit | null {
  const known = [total, principal, interest ?? 0, fees ?? 0];
  if (!known.every((value) => Number.isSafeInteger(value) && value >= 0)) return null;
  const givenInterest = interest ?? 0;
  const rest = total - principal - givenInterest;
  const resolvedFees = fees ?? rest;
  if (rest < 0 || principal + givenInterest + resolvedFees !== total) return null;
  return { principal, interest: givenInterest, fees: resolvedFees };
}

export type LoanLedgerEntry = Pick<
  Entry,
  | 'id'
  | 'type'
  | 'amount'
  | 'date'
  | 'accountId'
  | 'description'
  | 'loanRole'
  | 'principalAmount'
  | 'interestAmount'
  | 'feesAmount'
>;

export type LoanPaymentLine = {
  id: Id;
  date: CalendarDate;
  accountId: Id;
  description: string;
  total: number;
  principal: number;
  interest: number;
  fees: number;
  debtBefore: number;
  debtAfter: number;
};

export type LoanState = {
  /** Capital emprestado (o valor inicial do empréstimo), se conhecido. */
  original: number | null;
  /** Dívida de abertura na Miven e a data dela. */
  opening: number;
  openingOn: CalendarDate;
  principalPaid: number;
  interestPaid: number;
  feesPaid: number;
  /** Dinheiro recebido do empréstimo depois da abertura (aumenta a dívida). */
  disbursed: number;
  /** Dívida atual: abertura − capital pago + desembolsos. */
  debt: number;
  /** Capital amortizado desde o início, quando o capital inicial é conhecido. */
  amortized: number | null;
  amortizedRatio: number | null;
  /** Pagamentos do mais antigo para o mais recente, com a dívida antes e depois. */
  payments: LoanPaymentLine[];
};

/**
 * Estado de um empréstimo a partir da abertura e dos movimentos ligados (ADR-057). A dívida é
 * calculada: editar ou eliminar uma prestação recalcula-a. `null` para dívidas no modelo antigo
 * (sem `openingDebt`), que continuam a usar o valor guardado.
 */
export function loanState(
  item: Pick<WealthItem, 'openingDebt' | 'openingOn' | 'principalAmount'>,
  entries: readonly LoanLedgerEntry[],
): LoanState | null {
  if (item.openingDebt === null || item.openingOn === null) return null;
  const openingOn = item.openingOn;
  const counted = entries
    .filter((entry) => entry.date >= openingOn)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id.localeCompare(b.id)));
  let debt = item.openingDebt;
  let principalPaid = 0;
  let interestPaid = 0;
  let feesPaid = 0;
  let disbursed = 0;
  const payments: LoanPaymentLine[] = [];
  for (const entry of counted) {
    if (entry.loanRole === 'disbursement' && entry.type === 'income') {
      disbursed += entry.amount;
      debt += entry.amount;
      continue;
    }
    if (entry.loanRole !== 'payment' || entry.type !== 'expense') continue;
    const principal = entry.principalAmount ?? 0;
    const interest = entry.interestAmount ?? 0;
    const fees = entry.feesAmount ?? Math.max(0, entry.amount - principal - interest);
    const before = debt;
    debt -= principal;
    principalPaid += principal;
    interestPaid += interest;
    feesPaid += fees;
    payments.push({
      id: entry.id,
      date: entry.date,
      accountId: entry.accountId,
      description: entry.description,
      total: entry.amount,
      principal,
      interest,
      fees,
      debtBefore: before,
      debtAfter: debt,
    });
  }
  const original = item.principalAmount;
  const amortized = original === null ? null : Math.max(0, original + disbursed - debt);
  return {
    original,
    opening: item.openingDebt,
    openingOn,
    principalPaid,
    interestPaid,
    feesPaid,
    disbursed,
    debt,
    amortized,
    amortizedRatio:
      original === null || original + disbursed <= 0
        ? null
        : Math.min(1, Math.max(0, (amortized ?? 0) / (original + disbursed))),
    payments,
  };
}

/**
 * Próximo dia de pagamento (ou de fecho) a partir de hoje: este mês se ainda não passou, senão o
 * seguinte. Em meses mais curtos, o último dia do mês.
 */
export function nextMonthlyDate(day: number, today: CalendarDate): CalendarDate {
  const [year, month, current] = today.split('-').map(Number) as [number, number, number];
  const clamp = (y: number, m: number) => {
    const last = new Date(y, m, 0).getDate();
    return toCalendarDate(new Date(y, m - 1, Math.min(day, last)));
  };
  const thisMonth = clamp(year, month);
  if (Number(thisMonth.slice(8, 10)) >= current) return thisMonth;
  return month === 12 ? clamp(year + 1, 1) : clamp(year, month + 1);
}
