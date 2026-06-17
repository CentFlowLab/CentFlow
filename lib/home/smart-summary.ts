import { formatCurrency, formatPercent } from '@/lib/utils/format';

export function getSmartSummaryMessage(input: {
  hasActivity: boolean;
  netWorth: number;
  changePercent: number;
  monthlyChange: number;
  weeklySpending: number;
}): string {
  if (!input.hasActivity) {
    return 'Começa por adicionar o teu primeiro movimento para veres o teu panorama financeiro.';
  }

  if (input.changePercent > 2) {
    return `Património a subir ${formatPercent(input.changePercent, 1, false)} este mês — continua assim.`;
  }

  if (input.changePercent < -2) {
    return `Património desceu ${formatPercent(Math.abs(input.changePercent), 1, false)} este mês. Revê os gastos recentes.`;
  }

  if (input.monthlyChange > 0) {
    return `Ganhaste ${formatCurrency(input.monthlyChange)} de património este mês.`;
  }

  if (input.monthlyChange < 0) {
    return `Perdeste ${formatCurrency(Math.abs(input.monthlyChange))} de património este mês.`;
  }

  if (input.weeklySpending > 0) {
    return `Gastaste ${formatCurrency(input.weeklySpending)} esta semana — mantém o ritmo sob controlo.`;
  }

  return 'O teu panorama financeiro está estável. Regista movimentos para insights mais precisos.';
}

export function getTrendLabel(changePercent: number): string {
  if (changePercent > 0.5) return 'A subir';
  if (changePercent < -0.5) return 'A descer';
  return 'Estável';
}
