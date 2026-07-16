/**
 * Métricas mock para HANDOFF.md — sem dependências React Native.
 * Importa apenas funções puras de domínio (não o barrel @/lib/domain).
 */
import {
  calculateNetWorth,
  calculateNetWorthChangePercent,
} from '../lib/domain/financial/netWorth';
import { buildNetWorthProjection } from '../lib/domain/financial/projections';
import type {
  Account,
  AttentionItem,
  Credit,
  DashboardData,
  InventoryItem,
  RecurringInvestment,
  Suggestion,
} from '../lib/domain/types';

const PREVIOUS_MONTH_NET_WORTH = 14_820;

const HANDOFF_MOCK_ACCOUNTS: Account[] = [
  { id: 'acc-1', name: 'Conta à Ordem', balance: 4250.8, currency: 'EUR' },
  { id: 'acc-2', name: 'Poupança', balance: 8200.0, currency: 'EUR' },
  { id: 'acc-3', name: 'Carteira', balance: 180.5, currency: 'EUR' },
];

const HANDOFF_MOCK_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', name: 'MacBook Pro 14"', value: 1800, category: 'eletrónica' },
  { id: 'inv-2', name: 'iPhone 15', value: 950, category: 'eletrónica' },
  { id: 'inv-3', name: 'Bicicleta', value: 620, category: 'desporto' },
];

const HANDOFF_MOCK_INVESTMENTS: RecurringInvestment[] = [
  { id: 'ri-1', name: 'ETF MSCI World', isActive: true, appliedAmount: 5000, currentValue: 5420 },
  { id: 'ri-2', name: 'PPR Reforma', isActive: false, appliedAmount: 3000, currentValue: 3150 },
  { id: 'ri-3', name: 'Cripto DCA', isActive: true, appliedAmount: 800, currentValue: 720 },
];

const HANDOFF_MOCK_CREDITS: Credit[] = [
  { id: 'cr-1', name: 'Crédito automóvel', outstandingBalance: 12400 },
  { id: 'cr-2', name: 'Cartão de crédito', outstandingBalance: 850 },
];

const HANDOFF_ATTENTION_COUNT = 5;
const HANDOFF_SUGGESTIONS_COUNT = 2;
const HANDOFF_WEEKLY_SPENDING = 342.5;

/** Dashboard mock para o gerador HANDOFF — equivalente funcional a buildMockDashboard(). */
export function buildHandoffDashboardMetrics(): DashboardData {
  const netWorth = calculateNetWorth({
    accounts: HANDOFF_MOCK_ACCOUNTS,
    inventory: HANDOFF_MOCK_INVENTORY,
    investments: HANDOFF_MOCK_INVESTMENTS,
    credits: HANDOFF_MOCK_CREDITS,
  });

  const netWorthChangeThisMonth = netWorth.netWorth - PREVIOUS_MONTH_NET_WORTH;

  return {
    netWorth,
    projection: buildNetWorthProjection(netWorth.netWorth, 0),
    previousMonthNetWorth: PREVIOUS_MONTH_NET_WORTH,
    netWorthChangePercent: calculateNetWorthChangePercent(
      netWorth.netWorth,
      PREVIOUS_MONTH_NET_WORTH,
    ),
    weeklySpending: HANDOFF_WEEKLY_SPENDING,
    netWorthChangeThisMonth,
    personalInflation: 3.2,
    attentionItems: Array.from({ length: HANDOFF_ATTENTION_COUNT }, (_, i) => ({
      id: `att-${i}`,
      type: 'credit' as AttentionItem['type'],
      title: 'Alerta',
      description: 'Mock',
      priority: 'medium' as AttentionItem['priority'],
    })),
    suggestions: Array.from({ length: HANDOFF_SUGGESTIONS_COUNT }, (_, i) => ({
      id: `sug-${i}`,
      type: 'goal' as Suggestion['type'],
      title: 'Sugestão',
      description: 'Mock',
    })),
  };
}
