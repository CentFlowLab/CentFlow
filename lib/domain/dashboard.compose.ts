import { calculateNetWorth, buildNetWorthProjection } from './net-worth.service';
import { buildAttentionItems } from './attention-items';
import { calculateMonthlyNetWorthMetrics } from './net-worth-monthly';
import type { AssetsData } from './assets.types';
import type { DashboardData } from './types';
import type { Transaction } from './transaction.types';
import type { Credit } from './types';
import {
  filterOccurredTransactions,
  isTransactionOccurred,
  sumTransactionCashBalance,
} from './transaction-date.utils';

function sumWeeklyExpenses(
  transactions: Transaction[],
  asOf: Date = new Date(),
): number {
  const weekAgo = asOf.getTime() - 7 * 24 * 60 * 60 * 1000;

  return transactions
    .filter(
      (tx) =>
        tx.type === 'expense' &&
        isTransactionOccurred(tx.date, asOf) &&
        parseTransactionTime(tx.date) >= weekAgo,
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
}

function parseTransactionTime(date: string): number {
  return new Date(`${date.slice(0, 10)}T12:00:00`).getTime();
}

/** Dashboard mínimo a partir de dados Supabase (sem API legacy). */
export function composeDashboardFromLocalSources(input: {
  transactions: Transaction[];
  assets: AssetsData;
  credits?: Credit[];
  /** Data de referência — útil em testes; omissão = hoje. */
  asOf?: Date;
}): DashboardData {
  const asOf = input.asOf ?? new Date();
  const occurredCash = sumTransactionCashBalance(input.transactions, 'occurred', asOf);
  const futureMovementsDelta = sumTransactionCashBalance(
    input.transactions,
    'future',
    asOf,
  );
  const credits = input.credits ?? [];

  // Objetivos são alocação virtual do saldo (mental accounting), não um ativo
  // adicional. O dinheiro guardado num objetivo já está contabilizado no saldo
  // de movimentos — somá-lo outra vez duplicaria o património. Por isso o PL
  // NÃO inclui `goal.current` (savings: 0). Os objetivos continuam visíveis no
  // ecrã Ativos com o seu progresso próprio.
  const netWorth = calculateNetWorth({
    accounts: [
      {
        id: 'derived-cash',
        name: 'Saldo estimado',
        balance: occurredCash,
        currency: 'EUR',
      },
    ],
    inventory: input.assets.inventory,
    investments: [],
    savings: 0,
    credits,
  });

  const projection = buildNetWorthProjection(netWorth.netWorth, futureMovementsDelta);

  const monthlyMetrics = calculateMonthlyNetWorthMetrics(
    input.transactions,
    {
      inventory: input.assets.inventory,
      investments: [],
      credits,
      savings: 0,
    },
    netWorth.netWorth,
    asOf,
  );

  const attentionItems = buildAttentionItems({
    warranties: input.assets.warranties,
    credits,
    subscriptions: input.assets.subscriptions,
    goals: input.assets.goals,
    asOf,
  });

  return {
    netWorth,
    projection,
    previousMonthNetWorth: monthlyMetrics.previousMonthNetWorth,
    netWorthChangePercent: monthlyMetrics.netWorthChangePercent,
    weeklySpending: sumWeeklyExpenses(input.transactions, asOf),
    netWorthChangeThisMonth: monthlyMetrics.netWorthChangeThisMonth,
    personalInflation: null,
    attentionItems,
    suggestions: [],
  };
}

/** Movimentos já ocorridos — reutilizável em análises e score. */
export { filterOccurredTransactions };
