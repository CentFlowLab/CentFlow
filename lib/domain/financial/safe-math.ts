/**
 * Guardrails para métricas derivadas — evita NaN/Infinity/percentagens absurdas na UI.
 */

export function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator)) return null;
  if (!Number.isFinite(denominator) || denominator === 0) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

/** Percentagem 0–100; devolve null se a entrada não for finita. */
export function clampPercentage(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, value));
}

/**
 * Variação percentual vs período anterior.
 * Sem base comparável (0 / não finito) → null (“Sem comparação disponível”).
 */
export function percentChangeVsPrevious(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return null;
  const ratio = safeDivide(current - previous, Math.abs(previous));
  if (ratio == null) return null;
  return Math.round(ratio * 100);
}

/** Meses de cobertura; negativos ou inválidos → 0; sem despesas fixas → null. */
export function emergencyMonthsCovered(
  available: number,
  fixedMonthlyExpenses: number,
): number | null {
  if (!Number.isFinite(available) || !Number.isFinite(fixedMonthlyExpenses)) return null;
  if (fixedMonthlyExpenses <= 0) return null;
  if (available <= 0) return 0;
  const months = available / fixedMonthlyExpenses;
  return Number.isFinite(months) ? Math.round(months * 10) / 10 : null;
}

export function formatMissingMetricLabel(
  kind: 'insufficient' | 'no_comparison' | 'unavailable' | 'not_calculable' = 'insufficient',
): string {
  switch (kind) {
    case 'no_comparison':
      return 'Sem comparação disponível';
    case 'unavailable':
      return 'Ainda não é possível calcular';
    case 'not_calculable':
      return 'Não calculável';
    default:
      return 'Sem dados suficientes';
  }
}

/** Percentagem só quando o denominador é positivo e útil. */
export function safePercentage(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator <= 0) return null;
  const pct = (numerator / denominator) * 100;
  return Number.isFinite(pct) ? pct : null;
}

export function isMeaningfulComparison(previous: number, minAbsBase = 0.01): boolean {
  return Number.isFinite(previous) && Math.abs(previous) >= minAbsBase;
}

export function clampProgress(value: number, allowOver = false): number {
  if (!Number.isFinite(value)) return 0;
  if (allowOver) return Math.max(0, value);
  return Math.min(100, Math.max(0, value));
}
