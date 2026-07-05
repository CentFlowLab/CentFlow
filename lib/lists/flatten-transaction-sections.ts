import type { TransactionDaySection } from '@/lib/domain/transaction-grouping';
import type { Transaction } from '@/lib/domain/transaction.types';

export type MovementListRow =
  | { kind: 'header'; key: string; title: string; dayTotal: number }
  | { kind: 'transaction'; key: string; transaction: Transaction };

/** Achata secções por dia numa lista única para FlashList (header + rows). */
export function flattenTransactionSections(sections: TransactionDaySection[]): MovementListRow[] {
  const rows: MovementListRow[] = [];

  for (const section of sections) {
    rows.push({
      kind: 'header',
      key: `header-${section.key}`,
      title: section.title,
      dayTotal: section.dayTotal,
    });
    for (const transaction of section.data) {
      rows.push({
        kind: 'transaction',
        key: transaction.id,
        transaction,
      });
    }
  }

  return rows;
}
