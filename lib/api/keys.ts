export const queryKeys = {
  dashboard: ['dashboard'] as const,
  netWorth: ['net-worth'] as const,
  transactions: (filters?: Record<string, unknown>) =>
    ['transactions', filters ?? {}] as const,
  receipts: ['receipts'] as const,
  analytics: (period?: string) => ['analytics', period ?? 'month'] as const,
  goals: ['goals'] as const,
  warranties: ['warranties'] as const,
  inventory: ['inventory'] as const,
  profile: ['profile'] as const,
} as const;
