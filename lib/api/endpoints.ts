/**
 * Endpoints da API CentFlow.
 *
 * NOTA: Se o backend usar prefixo `/api`, inclui-o no EXPO_PUBLIC_API_URL
 * (ex: https://api.centflow.app/api) ou ajusta os paths abaixo.
 */
export const API_ENDPOINTS = {
  /** Resposta agregada do dashboard — preferido quando disponível */
  dashboard: '/dashboard',

  /** Património: entidades brutas OU resultado calculado */
  netWorth: '/net-worth',

  /** Métricas do período (gastos semana, inflação, etc.) */
  dashboardMetrics: '/dashboard/metrics',

  /** Alertas: garantias, créditos, subscrições */
  dashboardAttention: '/dashboard/attention',

  /** Sugestões inteligentes */
  dashboardSuggestions: '/dashboard/suggestions',

  /** Lista e criação de movimentos */
  transactions: '/transactions',

  /** Upload de talões/faturas (multipart) */
  receipts: '/receipts',

  /** Resumo de transações (fallback para gastos semanais) */
  transactionsSummary: '/transactions/summary',

  /** Dados agregados de Análises — preferido */
  analytics: '/analytics',

  /** Métricas de Análises (fallback composto) */
  analyticsMetrics: '/analytics/metrics',

  /** Insights CentFlow Brain (fallback composto) */
  analyticsInsights: '/analytics/insights',
} as const;

/** Endpoints dinâmicos de talões */
export const receiptEndpoints = {
  ocr: (receiptId: string) => `/receipts/${receiptId}/ocr`,
  ocrResult: (receiptId: string) => `/receipts/${receiptId}/ocr-result`,
  confirm: (receiptId: string) => `/receipts/${receiptId}/confirm`,
} as const;
