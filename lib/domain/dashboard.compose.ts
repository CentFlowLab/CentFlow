import { calculateNetWorth, buildNetWorthProjection } from './net-worth.service';
import { buildAttentionItems } from './attention-items';
import type { Suggestion } from './types';
import { calculateMonthlyNetWorthMetrics } from './net-worth-monthly';
import type { AssetsData } from './assets.types';
import type { Subscription } from './assets.types';
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
  subscriptions?: Subscription[];
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
    subscriptions: input.subscriptions ?? input.assets.subscriptions,
    goals: input.assets.goals,
    asOf,
  });

  const suggestions = buildHomeSuggestions({
    goals: input.assets.goals,
    hasTransactions: input.transactions.length > 0,
    weeklySpending: sumWeeklyExpenses(input.transactions, asOf),
    netWorthChangePercent: monthlyMetrics.netWorthChangePercent,
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
    suggestions,
  };
}

function buildHomeSuggestions(input: {
  goals: AssetsData['goals'];
  hasTransactions: boolean;
  weeklySpending: number;
  netWorthChangePercent: number;
}): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Sugestão de onboarding — só para quem ainda não tem objetivos NEM movimentos.
  // Quem já regista movimentos não deve ver o convite de "primeiro objetivo".
  if (input.goals.length === 0 && !input.hasTransactions) {
    suggestions.push({
      id: 'sug-first-goal',
      title: 'Define o teu primeiro objetivo',
      description: 'Um alvo concreto ajuda-te a poupar com mais foco.',
      actionLabel: 'Criar objetivo',
      type: 'goal',
    });
  }

  if (input.weeklySpending > 0 && input.netWorthChangePercent < 0) {
    suggestions.push({
      id: 'sug-review-spending',
      title: 'Revê os gastos desta semana',
      description: 'Identifica onde podes optimizar antes do fim do mês.',
      actionLabel: 'Ver gastos',
      type: 'savings',
      action: 'open_analises_gastos',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'sug-analyses',
      title: 'Explora as tuas análises',
      description: 'Vê como o património está distribuído entre categorias.',
      actionLabel: 'Abrir análises',
      type: 'general',
    });
  }

  return suggestions.slice(0, 2);
}

/** Movimentos já ocorridos — reutilizável em análises e score. */
export { filterOccurredTransactions };
