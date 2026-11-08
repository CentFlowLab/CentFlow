import type { BudgetLevel } from '@/core/finance';
import { ProgressBar } from '@/ui/components';

export function budgetTone(level: BudgetLevel): 'positive' | 'warning' | 'negative' {
  if (level === 'over') return 'negative';
  if (level === 'ok') return 'positive';
  return 'warning';
}

type Props = {
  level: BudgetLevel;
  /** Razão gasto/limite. A barra enche até 100%; a percentagem real vai no rótulo. */
  ratio: number;
  accessibilityLabel: string;
};

/** Indicador do limite. 75% e 90% são aviso; acima de 100% é excesso. */
export function BudgetMeter({ level, ratio, accessibilityLabel }: Props) {
  return (
    <ProgressBar
      progress={ratio}
      tone={budgetTone(level)}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
