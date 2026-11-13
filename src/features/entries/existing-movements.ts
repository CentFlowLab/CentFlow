import { statementRange, type ExistingMovement, type StatementRow } from '@/core/import';
import type { Repositories } from '@/data';

const PAGE = 500;

/**
 * Movimentos já registados numa conta, no intervalo de datas das linhas a importar, vistos do
 * lado dessa conta (uma transferência que sai é uma saída). Base da deteção de duplicados.
 */
export async function existingMovements(
  repositories: Repositories,
  accountId: string,
  rows: readonly Pick<StatementRow, 'date'>[],
): Promise<ExistingMovement[]> {
  const range = statementRange(rows as readonly StatementRow[]);
  if (!range) return [];
  const movements: ExistingMovement[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await repositories.entries.list({ accountId, ...range, limit: PAGE, offset });
    for (const entry of page.items) {
      const type =
        entry.type === 'transfer'
          ? entry.accountId === accountId
            ? 'expense'
            : 'income'
          : entry.type;
      movements.push({ date: entry.date, amount: entry.amount, type });
    }
    if (offset + PAGE >= page.total) break;
  }
  return movements;
}
