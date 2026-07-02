/**
 * Orçamento mensal — "Disponível até ao fim do mês".
 *
 * Função pura e determinística: dado o saldo actual, movimentos do mês
 * (ocorridos e futuros), subscrições e prestações de crédito, calcula quanto
 * o utilizador ainda pode gastar este mês.
 *
 * NUNCA misturar com património líquido — isto é orçamento mensal, não riqueza.
 */

export type SpendableMovementType = 'income' | 'expense';

export interface SpendableMovement {
  type: SpendableMovementType;
  amount: number;
  /** YYYY-MM-DD ou Date. Opcional — os movimentos já vêm filtrados ao mês. */
  date?: string | Date;
}

export interface SpendableSubscription {
  amount: number;
  /** Data de renovação/cobrança neste mês. Sem data = assume pendente. */
  dueDate?: string | Date;
}

export interface SpendableCreditInstallment {
  amount: number;
  /** Data da prestação neste mês. Sem data = assume pendente. */
  dueDate?: string | Date;
}

export type SpendableWarningCode =
  | 'LOW_BALANCE'
  | 'NEGATIVE_PROJECTED'
  | 'OVER_BUDGET'
  | 'NO_BUDGET_ACCOUNTS';

export interface SpendableWarning {
  code: SpendableWarningCode;
  message: string;
}

export interface MonthlySpendableInput {
  currentBalance: number;
  /** Movimentos já ocorridos este mês. */
  currentMonthMovements?: SpendableMovement[];
  /** Movimentos futuros confirmados este mês (ex.: salário). */
  futureMovements?: SpendableMovement[];
  /** Subscrições activas com cobrança este mês. */
  subscriptions?: SpendableSubscription[];
  /** Prestações de crédito deste mês. */
  creditInstallments?: SpendableCreditInstallment[];
  /** Orçamento mensal definido pelo utilizador (opcional). */
  monthlyBudget?: number;
  /** Data de referência — hoje por defeito. */
  referenceDate?: Date;
}

export interface MonthlySpendableOutput {
  remainingThisMonth: number;
  dailyAvailable: number;
  daysRemaining: number;
  projectedEndOfMonthBalance: number;
  warnings: SpendableWarning[];
}

/** Saldo a partir do qual se considera "baixo" o disponível para o resto do mês. */
export const LOW_BALANCE_THRESHOLD = 50;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toDate(value?: string | Date): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const key = value.slice(0, 10);
  const parsed = new Date(`${key}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function safeAmount(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function netOfMovements(movements: SpendableMovement[]): number {
  return movements.reduce((sum, movement) => {
    const amount = safeAmount(movement.amount);
    return sum + (movement.type === 'income' ? amount : -amount);
  }, 0);
}

function totalExpenses(movements: SpendableMovement[]): number {
  return movements.reduce(
    (sum, movement) => sum + (movement.type === 'expense' ? safeAmount(movement.amount) : 0),
    0,
  );
}

/** Obrigação conta para este mês se não tem data, ou se cai neste mês e ainda não passou. */
function isDueThisMonth(dueDate: Date | null, reference: Date): boolean {
  if (!dueDate) return true;
  const sameMonth =
    dueDate.getFullYear() === reference.getFullYear() &&
    dueDate.getMonth() === reference.getMonth();
  if (!sameMonth) return false;
  const startOfToday = new Date(reference);
  startOfToday.setHours(0, 0, 0, 0);
  return dueDate.getTime() >= startOfToday.getTime();
}

function daysRemainingInMonth(reference: Date): number {
  const lastDay = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
  return Math.max(1, lastDay - reference.getDate() + 1);
}

function sumDue(
  items: Array<{ amount: number; dueDate?: string | Date }>,
  reference: Date,
): number {
  return items
    .filter((item) => isDueThisMonth(toDate(item.dueDate), reference))
    .reduce((sum, item) => sum + safeAmount(item.amount), 0);
}

export function calculateMonthlySpendable(
  input: MonthlySpendableInput,
): MonthlySpendableOutput {
  const reference = input.referenceDate ?? new Date();
  const currentMonthMovements = input.currentMonthMovements ?? [];
  const futureMovements = input.futureMovements ?? [];
  const subscriptions = input.subscriptions ?? [];
  const creditInstallments = input.creditInstallments ?? [];

  const occurredNet = netOfMovements(currentMonthMovements);
  const futureNet = netOfMovements(futureMovements);
  const subscriptionsDue = sumDue(subscriptions, reference);
  const installmentsDue = sumDue(creditInstallments, reference);

  const baseRemaining =
    safeAmount(input.currentBalance) +
    occurredNet +
    futureNet -
    subscriptionsDue -
    installmentsDue;

  const spentThisMonth = totalExpenses(currentMonthMovements);

  let remainingThisMonth = baseRemaining;
  if (input.monthlyBudget != null) {
    remainingThisMonth = Math.min(baseRemaining, input.monthlyBudget - spentThisMonth);
  }

  const daysRemaining = daysRemainingInMonth(reference);
  const dailyAvailable = remainingThisMonth / daysRemaining;
  const projectedEndOfMonthBalance = baseRemaining;

  const warnings: SpendableWarning[] = [];
  if (remainingThisMonth < LOW_BALANCE_THRESHOLD) {
    warnings.push({
      code: 'LOW_BALANCE',
      message: 'Saldo disponível baixo para o resto do mês.',
    });
  }
  if (projectedEndOfMonthBalance < 0) {
    warnings.push({
      code: 'NEGATIVE_PROJECTED',
      message: 'A projeção de fim de mês é negativa.',
    });
  }
  if (input.monthlyBudget != null && spentThisMonth > input.monthlyBudget) {
    warnings.push({
      code: 'OVER_BUDGET',
      message: 'Já excedeste o orçamento mensal definido.',
    });
  }

  return {
    remainingThisMonth: round2(remainingThisMonth),
    dailyAvailable: round2(dailyAvailable),
    daysRemaining,
    projectedEndOfMonthBalance: round2(projectedEndOfMonthBalance),
    warnings,
  };
}
