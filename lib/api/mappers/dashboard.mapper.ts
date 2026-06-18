import {
  calculateNetWorth,
  calculateNetWorthChangePercent,
  type Account,
  type AttentionItem,
  type AttentionPriority,
  type AttentionType,
  type Credit,
  type DashboardData,
  type InventoryItem,
  type NetWorthResult,
  type RecurringInvestment,
  type Suggestion,
} from '@/lib/domain';
import type {
  RawAccount,
  RawAttentionItem,
  RawCredit,
  RawDashboardMetrics,
  RawDashboardResponse,
  RawInventoryItem,
  RawNetWorthResponse,
  RawRecurringInvestment,
  RawSuggestion,
  RawTransactionsSummary,
} from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick<T>(...values: (T | undefined | null)[]): T | undefined {
  return values.find((v) => v !== undefined && v !== null) as T | undefined;
}

function unwrap<T extends object>(payload: T | { data?: T }): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    (payload as { data?: T }).data
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toId(value: string | number | undefined): string {
  return value !== undefined ? String(value) : '';
}

// ─── Entity normalizers ───────────────────────────────────────────────────────

function mapAccount(raw: RawAccount): Account {
  return {
    id: toId(raw.id),
    name: raw.name ?? 'Conta',
    balance: toNumber(raw.balance),
    currency: raw.currency ?? 'EUR',
  };
}

function mapInventoryItem(raw: RawInventoryItem): InventoryItem {
  return {
    id: toId(raw.id),
    name: raw.name ?? 'Item',
    value: toNumber(raw.value),
    category: raw.category,
  };
}

function mapInvestment(raw: RawRecurringInvestment): RecurringInvestment {
  return {
    id: toId(raw.id),
    name: raw.name ?? 'Investimento',
    isActive: pick(raw.isActive, raw.is_active) ?? false,
    appliedAmount: toNumber(pick(raw.appliedAmount, raw.applied_amount)),
    currentValue: toNumber(pick(raw.currentValue, raw.current_value)),
  };
}

function mapCredit(raw: RawCredit): Credit {
  return {
    id: toId(raw.id),
    name: raw.name ?? 'Crédito',
    outstandingBalance: toNumber(
      pick(raw.outstandingBalance, raw.outstanding_balance),
    ),
    nextPaymentDate: pick(raw.nextPaymentDate, raw.next_payment_date),
    nextPaymentAmount: pick(raw.nextPaymentAmount, raw.next_payment_amount),
  };
}

function mapAttentionItem(raw: RawAttentionItem): AttentionItem {
  const priority = (raw.priority ?? 'medium') as AttentionPriority;
  return {
    id: toId(raw.id),
    type: normalizeAttentionType(raw.type),
    title: raw.title ?? 'Alerta',
    description: raw.description ?? '',
    dueDate: pick(raw.dueDate, raw.due_date),
    priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
    amount: raw.amount,
  };
}

function mapSuggestion(raw: RawSuggestion): Suggestion {
  return {
    id: toId(raw.id),
    title: raw.title ?? 'Sugestão',
    description: raw.description ?? '',
    actionLabel: pick(raw.actionLabel, raw.action_label),
    type: (raw.type ?? 'general') as Suggestion['type'],
  };
}

// ─── Net worth ────────────────────────────────────────────────────────────────

/**
 * Converte resposta de património da API.
 * Se o backend enviar entidades brutas → calcula localmente (net-worth.service).
 * Se enviar valores já calculados → usa directamente.
 */
export function mapNetWorth(raw: RawNetWorthResponse): NetWorthResult {
  const hasEntities =
    (raw.accounts?.length ?? 0) > 0 ||
    (raw.inventory?.length ?? 0) > 0 ||
    (raw.investments?.length ?? 0) > 0 ||
    (raw.recurring_investments?.length ?? 0) > 0 ||
    (raw.credits?.length ?? 0) > 0;

  if (hasEntities) {
    return calculateNetWorth({
      accounts: (raw.accounts ?? []).map(mapAccount),
      inventory: (raw.inventory ?? []).map(mapInventoryItem),
      investments: (raw.investments ?? raw.recurring_investments ?? []).map(
        mapInvestment,
      ),
      credits: (raw.credits ?? []).map(mapCredit),
    });
  }

  const breakdown = raw.breakdown ?? {};
  const assetsByCategory = (
    raw.assetsByCategory ??
    raw.assets_by_category ??
    []
  ).map((item) => ({
    key: (item.key ?? 'accounts') as NetWorthResult['assetsByCategory'][0]['key'],
    label: item.label ?? '',
    value: toNumber(item.value),
  }));

  return {
    totalAssets: toNumber(pick(raw.totalAssets, raw.total_assets)),
    totalLiabilities: toNumber(
      pick(raw.totalLiabilities, raw.total_liabilities),
    ),
    netWorth: toNumber(pick(raw.netWorth, raw.net_worth)),
    breakdown: {
      accounts: toNumber(breakdown.accounts),
      inventory: toNumber(breakdown.inventory),
      investments: toNumber(breakdown.investments),
      savings: toNumber(breakdown.savings ?? 0),
      liabilities: toNumber(breakdown.liabilities),
    },
    assetsByCategory,
  };
}

function extractMetrics(
  dashboard: RawDashboardResponse,
  metrics?: RawDashboardMetrics,
): {
  weeklySpending: number;
  netWorthChangeThisMonth: number;
  personalInflation: number | null;
  previousMonthNetWorth: number;
  netWorthChangePercent?: number;
} {
  const m = metrics ?? dashboard.metrics ?? dashboard;

  const weeklySpending = toNumber(
    pick(m.weeklySpending, m.weekly_spending, dashboard.weeklySpending, dashboard.weekly_spending),
  );

  const netWorthChangeThisMonth = toNumber(
    pick(
      m.netWorthChangeThisMonth,
      m.net_worth_change_this_month,
      dashboard.netWorthChangeThisMonth,
      dashboard.net_worth_change_this_month,
    ),
  );

  const personalInflationRaw = pick(
    m.personalInflation,
    m.personal_inflation,
    dashboard.personalInflation,
    dashboard.personal_inflation,
  );

  const previousMonthNetWorth = toNumber(
    pick(
      m.previousMonthNetWorth,
      m.previous_month_net_worth,
      dashboard.previousMonthNetWorth,
      dashboard.previous_month_net_worth,
    ),
  );

  const netWorthChangePercent = pick(
    m.netWorthChangePercent,
    m.net_worth_change_percent,
    dashboard.netWorthChangePercent,
    dashboard.net_worth_change_percent,
  );

  return {
    weeklySpending,
    netWorthChangeThisMonth,
    personalInflation:
      personalInflationRaw === undefined || personalInflationRaw === null
        ? null
        : toNumber(personalInflationRaw),
    previousMonthNetWorth,
    netWorthChangePercent,
  };
}

// ─── Dashboard mapper ─────────────────────────────────────────────────────────

export function mapDashboardResponse(raw: RawDashboardResponse): DashboardData {
  const dashboard = unwrap(raw);
  const netWorthRaw = dashboard.netWorth ?? dashboard.net_worth ?? dashboard;
  const netWorth = mapNetWorth(netWorthRaw as RawNetWorthResponse);

  const metrics = extractMetrics(dashboard);
  const previousMonthNetWorth =
    metrics.previousMonthNetWorth ||
    pick(
      (netWorthRaw as RawNetWorthResponse).previousMonthNetWorth,
      (netWorthRaw as RawNetWorthResponse).previous_month_net_worth,
    ) ||
    0;

  const netWorthChangeThisMonth =
    metrics.netWorthChangeThisMonth ||
    netWorth.netWorth - previousMonthNetWorth;

  const netWorthChangePercent =
    metrics.netWorthChangePercent ??
    calculateNetWorthChangePercent(netWorth.netWorth, previousMonthNetWorth);

  const attentionItems = (
    dashboard.attentionItems ??
    dashboard.attention_items ??
    []
  ).map(mapAttentionItem);

  const suggestions = (dashboard.suggestions ?? []).map(mapSuggestion);

  return {
    netWorth,
    previousMonthNetWorth,
    netWorthChangePercent,
    weeklySpending: metrics.weeklySpending,
    netWorthChangeThisMonth,
    personalInflation: metrics.personalInflation,
    attentionItems: attentionItems.sort(
      (a, b) => priorityWeight(a.priority) - priorityWeight(b.priority),
    ),
    suggestions,
  };
}

/** Compõe DashboardData a partir de múltiplos endpoints (fallback). */
export function composeDashboardData(parts: {
  netWorth: RawNetWorthResponse;
  metrics?: RawDashboardMetrics;
  attention?: RawAttentionItem[];
  suggestions?: RawSuggestion[];
  transactionsSummary?: RawTransactionsSummary;
}): DashboardData {
  const netWorth = mapNetWorth(parts.netWorth);

  const previousMonthNetWorth = toNumber(
    pick(
      parts.netWorth.previousMonthNetWorth,
      parts.netWorth.previous_month_net_worth,
      parts.metrics?.previousMonthNetWorth,
      parts.metrics?.previous_month_net_worth,
    ),
  );

  const weeklySpending = toNumber(
    pick(
      parts.metrics?.weeklySpending,
      parts.metrics?.weekly_spending,
      parts.transactionsSummary?.weeklySpending,
      parts.transactionsSummary?.weekly_spending,
    ),
  );

  const netWorthChangeThisMonth = toNumber(
    pick(
      parts.metrics?.netWorthChangeThisMonth,
      parts.metrics?.net_worth_change_this_month,
    ),
    netWorth.netWorth - previousMonthNetWorth,
  );

  const personalInflationRaw = pick(
    parts.metrics?.personalInflation,
    parts.metrics?.personal_inflation,
  );

  return {
    netWorth,
    previousMonthNetWorth,
    netWorthChangePercent:
      pick(
        parts.metrics?.netWorthChangePercent,
        parts.metrics?.net_worth_change_percent,
      ) ?? calculateNetWorthChangePercent(netWorth.netWorth, previousMonthNetWorth),
    weeklySpending,
    netWorthChangeThisMonth,
    personalInflation:
      personalInflationRaw === undefined || personalInflationRaw === null
        ? null
        : toNumber(personalInflationRaw),
    attentionItems: (parts.attention ?? []).map(mapAttentionItem),
    suggestions: (parts.suggestions ?? []).map(mapSuggestion),
  };
}

function priorityWeight(priority: AttentionPriority): number {
  return { high: 0, medium: 1, low: 2 }[priority];
}

function normalizeAttentionType(type?: string): AttentionType {
  if (type === 'warranty' || type === 'credit' || type === 'subscription') {
    return type;
  }
  return 'subscription';
}
