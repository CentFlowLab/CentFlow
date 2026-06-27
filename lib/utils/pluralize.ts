/** Utilitários de pluralização em português europeu. */

/** Junta `count` ao singular/plural correto. Ex.: pluralize(1,'dia','dias') → "1 dia". */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "1 subscrição a renovar" / "3 subscrições a renovar". */
export function pluralizeSubscricoes(count: number): string {
  return count === 1
    ? `${count} subscrição a renovar`
    : `${count} subscrições a renovar`;
}
