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
