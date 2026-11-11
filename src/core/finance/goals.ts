import type { CalendarDate } from './dates';

/**
 * O progresso de um objetivo é a soma das contribuições que ainda estão ativas.
 * O objetivo não guarda esse total. Quem chama filtra as eliminadas e as de outro objetivo.
 */
export function savedAmountMinor(amounts: readonly number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}

export function remainingAmountMinor(targetMinor: number, savedMinor: number): number {
  return Math.max(0, targetMinor - savedMinor);
}

export type GoalStatus = {
  saved: number;
  remaining: number;
  /** Poupado ÷ alvo, entre 0 e 1 (a barra nunca passa de 100 %). */
  ratio: number;
  reached: boolean;
  /** O que passou do alvo (0 se não passou). */
  surplus: number;
  /** Dia da contribuição que fez atingir o alvo; `null` se ainda não foi atingido. */
  achievedOn: CalendarDate | null;
};

/**
 * Estado de um objetivo a partir das contribuições ativas. Nada é guardado: mudar o alvo ou apagar
 * uma contribuição recalcula tudo (um objetivo concluído pode voltar a "em curso").
 */
export function goalStatus(
  targetAmount: number,
  contributions: readonly { id: string; amount: number; date: CalendarDate }[],
): GoalStatus {
  const ordered = [...contributions].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.id.localeCompare(b.id),
  );
  let saved = 0;
  let achievedOn: CalendarDate | null = null;
  for (const contribution of ordered) {
    saved += contribution.amount;
    if (achievedOn === null && saved >= targetAmount) achievedOn = contribution.date;
  }
  const reached = targetAmount > 0 && saved >= targetAmount;
  return {
    saved,
    remaining: remainingAmountMinor(targetAmount, saved),
    ratio: targetAmount <= 0 ? 0 : Math.min(1, saved / targetAmount),
    reached,
    surplus: Math.max(0, saved - targetAmount),
    achievedOn: reached ? achievedOn : null,
  };
}

export type GoalMonth = { month: string; amount: number; cumulative: number };

/** Contribuições por mês (`YYYY-MM`), do mais antigo ao mais recente, com o acumulado. */
export function goalEvolution(
  contributions: readonly { amount: number; date: CalendarDate }[],
): GoalMonth[] {
  const byMonth = new Map<string, number>();
  for (const contribution of contributions) {
    const month = contribution.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + contribution.amount);
  }
  let cumulative = 0;
  return [...byMonth.keys()].sort().map((month) => {
    const amount = byMonth.get(month) ?? 0;
    cumulative += amount;
    return { month, amount, cumulative };
  });
}
