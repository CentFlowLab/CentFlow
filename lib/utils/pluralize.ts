/** Utilitários de pluralização em português europeu. */

/** Junta `count` ao singular/plural correto. Ex.: pluralize(1,'dia','dias') → "1 dia". */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "1 despesa recorrente a renovar" / "3 despesas recorrentes a renovar". */
export function pluralizeSubscricoes(count: number): string {
  return count === 1
    ? `${count} despesa recorrente a renovar`
    : `${count} despesas recorrentes a renovar`;
}
