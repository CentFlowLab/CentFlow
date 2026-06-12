import type { AnalysisData, AnalysisInsight, AnalysisMetric } from '@/lib/domain/analysis.types';
import { buildMockDashboard } from '@/lib/data/mocks';
import { formatPercent } from '@/lib/utils/format';

/**
 * Mock local — usado apenas em testes e no gerador HANDOFF.md.
 * A aba Análises usa fetchAnalysisData() via useAnalysisData().
 */
export function buildMockAnalysisData(): AnalysisData {
  const dashboard = buildMockDashboard();
  const { netWorth } = dashboard;

  const totalAssets = netWorth.totalAssets || 1;
  const investmentShare = (netWorth.breakdown.investments / totalAssets) * 100;
  const liquidityShare = (netWorth.breakdown.accounts / totalAssets) * 100;
  const debtRatio =
    netWorth.totalAssets > 0
      ? (netWorth.totalLiabilities / netWorth.totalAssets) * 100
      : 0;

  const savingsRate = 18.5;

  const metrics: AnalysisMetric[] = [
    {
      id: 'savings-rate',
      label: 'Taxa de poupança',
      value: formatPercent(savingsRate),
      subtitle: 'este mês',
      trend: 'up',
      icon: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
      color: '#34D399',
    },
    {
      id: 'debt-ratio',
      label: 'Rácio de dívida',
      value: formatPercent(debtRatio),
      subtitle: 'passivos / ativos',
      trend: debtRatio > 40 ? 'down' : 'neutral',
      icon: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
      color: debtRatio > 40 ? '#F87171' : '#94A3B8',
    },
    {
      id: 'investment-share',
      label: 'Investido',
      value: formatPercent(investmentShare),
      subtitle: 'do património',
      trend: 'up',
      icon: {
        ios: 'chart.line.uptrend.xyaxis',
        android: 'trending_up',
        web: 'trending_up',
      },
      color: '#2DD4BF',
    },
    {
      id: 'liquidity',
      label: 'Liquidez',
      value: formatPercent(liquidityShare),
      subtitle: 'em contas',
      trend: 'neutral',
      icon: { ios: 'banknote.fill', android: 'payments', web: 'payments' },
      color: '#F5C451',
    },
  ];

  const insights: AnalysisInsight[] = [
    {
      id: 'ins-1',
      type: 'opportunity',
      title: 'Diversifica o inventário',
      description:
        '62% do teu património em bens físicos está concentrado em eletrónica. Considera reavaliar valores.',
      actionLabel: 'Ver inventário',
    },
    {
      id: 'ins-2',
      type: 'achievement',
      title: 'Investimentos a crescer',
      description:
        'A quota de investimentos subiu 4,2% este trimestre. Mantém as regras de DCA activas.',
    },
    {
      id: 'ins-3',
      type: 'warning',
      title: 'Dívida acima da média',
      description:
        'O rácio passivos/ativos está a 52%. Prioriza amortizações para reduzir juros pagos.',
      actionLabel: 'Ver créditos',
    },
  ];

  return {
    netWorth,
    allocation: netWorth.assetsByCategory,
    metrics,
    insights,
    periodLabel: 'Últimos 30 dias',
  };
}
