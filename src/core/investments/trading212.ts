/**
 * Trading 212 (API pública oficial v0, docs.trading212.com). Só leitura: resumo da conta e
 * posições abertas. Sem tempo real: a API responde a pedidos, com limites por conta (resumo
 * 1 pedido/5 s, posições 1/s). Os valores vêm na moeda principal da conta; a Miven não converte.
 * Código puro: corre na Edge Function `t212` (Deno) e nos testes (Jest).
 */

export const T212_HOSTS = {
  live: 'https://live.trading212.com',
  demo: 'https://demo.trading212.com',
} as const;
export type T212Environment = keyof typeof T212_HOSTS;

/** Intervalo mínimo entre atualizações da mesma conta (bem acima dos limites da API). */
export const T212_MIN_REFRESH_MS = 10_000;
/** Frequência com a app aberta no ecrã da integração. */
export const T212_POLL_MS = 60_000;
/** Depois disto, os valores são mostrados como desatualizados. */
export const T212_STALE_MS = 15 * 60_000;

export type T212Position = {
  ticker: string;
  name: string;
  isin: string | null;
  instrumentCurrency: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  /** Na moeda da conta (`walletImpact`), em unidades mínimas. */
  value: number;
  cost: number;
  unrealized: number;
};

export type T212Snapshot = {
  currency: string;
  /** Dinheiro livre para investir, em unidades mínimas. */
  cashAvailable: number;
  /** Dinheiro reservado para ordens pendentes ou parado nas pies (não investido). */
  cashOther: number;
  /** Valor de mercado das posições. */
  invested: number;
  /** Custo das posições atuais. */
  cost: number;
  unrealized: number;
  realized: number | null;
  /** Valor total da conta (o que entra no património). */
  total: number;
  positions: T212Position[];
  takenAt: string;
};

const num = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;
const text = (value: unknown): string => (typeof value === 'string' ? value : '');
/** Unidades principais → mínimas (2 casas; a API devolve decimais). */
const minor = (value: unknown): number => Math.round(num(value) * 100);

export type T212ParseResult =
  { ok: true; snapshot: T212Snapshot } | { ok: false; reason: 'invalid' };

/** Junta o resumo (`/equity/account/summary`) e as posições (`/equity/positions`). */
export function parseT212(summary: unknown, positions: unknown, takenAt: string): T212ParseResult {
  const s = summary as {
    currency?: unknown;
    totalValue?: unknown;
    cash?: { availableToTrade?: unknown; inPies?: unknown; reservedForOrders?: unknown };
    investments?: {
      currentValue?: unknown;
      totalCost?: unknown;
      unrealizedProfitLoss?: unknown;
      realizedProfitLoss?: unknown;
    };
  } | null;
  const currency = text(s?.currency);
  if (
    !s ||
    !/^[A-Z]{3}$/.test(currency) ||
    typeof s.totalValue !== 'number' ||
    !Array.isArray(positions)
  ) {
    return { ok: false, reason: 'invalid' };
  }
  const list: T212Position[] = positions.map((raw) => {
    const p = raw as {
      instrument?: { ticker?: unknown; name?: unknown; isin?: unknown; currency?: unknown };
      quantity?: unknown;
      averagePricePaid?: unknown;
      currentPrice?: unknown;
      walletImpact?: {
        currentValue?: unknown;
        totalCost?: unknown;
        unrealizedProfitLoss?: unknown;
      };
    };
    return {
      ticker: text(p.instrument?.ticker),
      name: text(p.instrument?.name) || text(p.instrument?.ticker),
      isin: text(p.instrument?.isin) || null,
      instrumentCurrency: text(p.instrument?.currency),
      quantity: num(p.quantity),
      averagePrice: num(p.averagePricePaid),
      currentPrice: num(p.currentPrice),
      value: minor(p.walletImpact?.currentValue),
      cost: minor(p.walletImpact?.totalCost),
      unrealized: minor(p.walletImpact?.unrealizedProfitLoss),
    };
  });
  list.sort((a, b) => b.value - a.value);
  return {
    ok: true,
    snapshot: {
      currency,
      cashAvailable: minor(s.cash?.availableToTrade),
      cashOther: minor(s.cash?.inPies) + minor(s.cash?.reservedForOrders),
      invested: minor(s.investments?.currentValue),
      cost: minor(s.investments?.totalCost),
      unrealized: minor(s.investments?.unrealizedProfitLoss),
      realized:
        typeof s.investments?.realizedProfitLoss === 'number'
          ? minor(s.investments.realizedProfitLoss)
          : null,
      total: minor(s.totalValue),
      positions: list,
      takenAt,
    },
  };
}

/** Pode pedir dados novos agora? (protege os limites da API mesmo com vários aparelhos). */
export function canRefresh(lastSyncAt: string | null, now: number): boolean {
  if (!lastSyncAt) return true;
  const last = Date.parse(lastSyncAt);
  return !Number.isFinite(last) || now - last >= T212_MIN_REFRESH_MS;
}

export function isStale(takenAt: string | null, now: number): boolean {
  if (!takenAt) return true;
  const at = Date.parse(takenAt);
  return !Number.isFinite(at) || now - at > T212_STALE_MS;
}

/** Validação mínima antes de enviar: nunca guardar lixo como credencial. */
export function validCredentials(input: {
  apiKey?: unknown;
  apiSecret?: unknown;
  environment?: unknown;
}) {
  const apiKey = text(input.apiKey).trim();
  const apiSecret = text(input.apiSecret).trim();
  const environment =
    input.environment === 'demo' ? 'demo' : input.environment === 'live' ? 'live' : null;
  if (apiKey.length < 8 || apiKey.length > 200 || apiSecret.length > 200 || environment === null) {
    return null;
  }
  return { apiKey, apiSecret, environment: environment as T212Environment };
}

/** Cabeçalho Basic (chave como utilizador, segredo como palavra-passe). */
export function basicAuth(apiKey: string, apiSecret: string): string {
  const bytes = new TextEncoder().encode(`${apiKey}:${apiSecret}`);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `Basic ${btoa(binary)}`;
}

/** Erros que a app mostra (códigos, nunca a mensagem da API). */
export type T212ErrorCode =
  'unauthorized' | 'rateLimited' | 'unavailable' | 'invalid' | 'notConnected';

export function errorFromStatus(status: number): T212ErrorCode {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 429) return 'rateLimited';
  return 'unavailable';
}
