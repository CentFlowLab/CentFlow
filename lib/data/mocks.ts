import {
  calculateNetWorth,
  calculateNetWorthChangePercent,
  buildNetWorthProjection,
  type Account,
  type AttentionItem,
  type Credit,
  type DashboardData,
  type InventoryItem,
  type RecurringInvestment,
  type Suggestion,
} from '@/lib/domain';

// ─── Entidades base (reutilizáveis em Ativos, Análises, etc.) ─────────────────

export const mockAccounts: Account[] = [
  { id: 'acc-1', name: 'Conta à Ordem', balance: 4250.8, currency: 'EUR' },
  { id: 'acc-2', name: 'Poupança', balance: 8200.0, currency: 'EUR' },
  { id: 'acc-3', name: 'Carteira', balance: 180.5, currency: 'EUR' },
];

export const mockInventory: InventoryItem[] = [
  { id: 'inv-1', name: 'MacBook Pro 14"', value: 1800, category: 'eletrónica' },
  { id: 'inv-2', name: 'iPhone 15', value: 950, category: 'eletrónica' },
  { id: 'inv-3', name: 'Bicicleta', value: 620, category: 'desporto' },
];

export const mockRecurringInvestments: RecurringInvestment[] = [
  {
    id: 'ri-1',
    name: 'ETF MSCI World',
    isActive: true,
    appliedAmount: 5000,
    currentValue: 5420,
  },
  {
    id: 'ri-2',
    name: 'PPR Reforma',
    isActive: false,
    appliedAmount: 3000,
    currentValue: 3150,
  },
  {
    id: 'ri-3',
    name: 'Cripto DCA',
    isActive: true,
    appliedAmount: 800,
    currentValue: 720,
  },
  {
    id: 'ri-4',
    name: 'Plano antigo (cancelado)',
    isActive: false,
    appliedAmount: 0,
    currentValue: 0,
  },
];

export const mockCredits: Credit[] = [
  {
    id: 'cr-1',
    name: 'Crédito automóvel',
    outstandingBalance: 12400,
    nextPaymentDate: getDateFromNow(5),
    nextPaymentAmount: 285,
  },
  {
    id: 'cr-2',
    name: 'Cartão de crédito',
    outstandingBalance: 850,
    nextPaymentDate: getDateFromNow(18),
    nextPaymentAmount: 850,
  },
];

export const mockWarranties = [
  {
    id: 'war-1',
    product: 'MacBook Pro 14"',
    expiresAt: getDateFromNow(12),
    store: 'Fnac',
    receiptTransactionId: 'mock-tx-4',
    receiptId: 'mock-receipt-1',
    receiptLabel: 'Fnac · MacBook Pro 14"',
  },
  {
    id: 'war-2',
    product: 'Frigorífico Samsung',
    expiresAt: getDateFromNow(45),
    store: 'Worten',
  },
  {
    id: 'war-3',
    product: 'Aspirador Dyson',
    expiresAt: getDateFromNow(8),
    store: 'El Corte Inglés',
  },
];

export const mockSubscriptions = [
  {
    id: 'sub-1',
    name: 'Netflix',
    amount: 15.99,
    renewsAt: getDateFromNow(1),
  },
  {
    id: 'sub-2',
    name: 'Spotify',
    amount: 10.99,
    renewsAt: getDateFromNow(14),
  },
  {
    id: 'sub-3',
    name: 'iCloud+',
    amount: 2.99,
    renewsAt: getDateFromNow(7),
  },
];

// ─── Perfil ───────────────────────────────────────────────────────────────────

export const mockProfile = {
  id: '1',
  name: 'Emanuel',
  email: 'emanuel@centflow.app',
  avatarInitials: 'EM',
  currency: 'EUR',
};

// ─── Transações (legado — use fetchTransactions via useTransactions) ───────────

export const mockTransactions: Array<{
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
}> = [];

export const mockGoals = [
  { id: 'goal-1', name: 'Fundo de emergência', target: 5000, current: 4250, deadline: '2026-12-31' },
  { id: 'goal-2', name: 'Viagem Japão', target: 3000, current: 1200, deadline: '2027-06-01' },
];

// ─── Dashboard (composto a partir das entidades base) ─────────────────────────

const PREVIOUS_MONTH_NET_WORTH = 9850;

function buildAttentionItems(): AttentionItem[] {
  const items: AttentionItem[] = [
    {
      id: 'att-1',
      type: 'warranty',
      title: 'Garantia a expirar',
      description: 'Aspirador Dyson — validade termina em breve',
      dueDate: mockWarranties[2].expiresAt,
      priority: 'high',
    },
    {
      id: 'att-2',
      type: 'credit',
      title: 'Prestação próxima',
      description: 'Crédito automóvel — €285',
      dueDate: mockCredits[0].nextPaymentDate,
      priority: 'high',
      amount: mockCredits[0].nextPaymentAmount,
    },
    {
      id: 'att-3',
      type: 'subscription',
      title: 'Renovação de subscrição',
      description: 'Netflix — €15,99/mês',
      dueDate: mockSubscriptions[0].renewsAt,
      priority: 'medium',
      amount: mockSubscriptions[0].amount,
    },
    {
      id: 'att-4',
      type: 'warranty',
      title: 'Garantia a expirar',
      description: 'MacBook Pro 14" — validade termina em breve',
      dueDate: mockWarranties[0].expiresAt,
      priority: 'medium',
    },
    {
      id: 'att-5',
      type: 'subscription',
      title: 'Renovação de subscrição',
      description: 'iCloud+ — €2,99/mês',
      dueDate: mockSubscriptions[2].renewsAt,
      priority: 'low',
      amount: mockSubscriptions[2].amount,
    },
  ];

  return items.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
}

function buildSuggestions(): Suggestion[] {
  return [
    {
      id: 'sug-1',
      type: 'goal',
      title: 'Meta quase completa',
      description: 'O teu Fundo de emergência está a 85%. Faltam €750 para o objetivo.',
      actionLabel: 'Ver objetivo',
    },
    {
      id: 'sug-2',
      type: 'savings',
      title: 'Oportunidade de poupança',
      description: 'Revê 3 subscrições ativas — podes poupar cerca de €29/mês.',
      actionLabel: 'Ver subscrições',
    },
  ];
}

/**
 * Mock local — usado apenas em testes e no gerador HANDOFF.md.
 * O ecrã Início usa fetchDashboardData() via useDashboardData().
 */
export function buildMockDashboard(): DashboardData {
  const netWorth = calculateNetWorth({
    accounts: mockAccounts,
    inventory: mockInventory,
    investments: mockRecurringInvestments,
    credits: mockCredits,
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
    weeklySpending: 342.5,
    netWorthChangeThisMonth,
    personalInflation: 3.2,
    attentionItems: buildAttentionItems(),
    suggestions: buildSuggestions(),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function priorityWeight(priority: AttentionItem['priority']): number {
  const weights = { high: 0, medium: 1, low: 2 };
  return weights[priority];
}
