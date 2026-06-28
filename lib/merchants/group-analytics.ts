import type { MerchantGroup, MerchantGroupWithStats } from '@/lib/domain/merchant-group.types';
import type { Transaction } from '@/lib/domain/transaction.types';

export type MerchantGroupAnalytics = MerchantGroupWithStats & {
  monthAmount: number;
  previousMonthAmount: number;
  monthChangePercent: number | null;
  purchasesThisMonth: number;
};

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function isInMonth(dateStr: string, yearMonth: string): boolean {
  return monthKey(dateStr) === yearMonth;
}

function previousMonthKey(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y!, (m ?? 1) - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function computeMerchantGroupAnalytics(
  groups: MerchantGroup[],
  transactions: Transaction[],
  referenceDate = new Date(),
): MerchantGroupAnalytics[] {
  const currentMonth = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
  const prevMonth = previousMonthKey(currentMonth);

  const expenses = transactions.filter((tx) => tx.type === 'expense');

  return groups
    .map((group) => {
      const related = expenses.filter((tx) => tx.merchantGroupId === group.id);
      const totalAmount = related.reduce((sum, tx) => sum + tx.amount, 0);
      const sorted = [...related].sort((a, b) => b.date.localeCompare(a.date));
      const last = sorted[0];

      const monthTxs = related.filter((tx) => isInMonth(tx.date, currentMonth));
      const prevTxs = related.filter((tx) => isInMonth(tx.date, prevMonth));
      const monthAmount = monthTxs.reduce((s, tx) => s + tx.amount, 0);
      const previousMonthAmount = prevTxs.reduce((s, tx) => s + tx.amount, 0);

      let monthChangePercent: number | null = null;
      if (previousMonthAmount > 0) {
        monthChangePercent = ((monthAmount - previousMonthAmount) / previousMonthAmount) * 100;
      } else if (monthAmount > 0) {
        monthChangePercent = 100;
      }

      return {
        ...group,
        movementCount: related.length,
        totalAmount,
        lastDate: last?.date,
        lastAmount: last?.amount,
        monthAmount,
        previousMonthAmount,
        monthChangePercent,
        purchasesThisMonth: monthTxs.length,
      };
    })
    .filter((g) => g.movementCount > 0)
    .sort((a, b) => b.monthAmount - a.monthAmount || b.totalAmount - a.totalAmount);
}

export function computeMonthlySpendingForGroup(
  groupId: string,
  transactions: Transaction[],
  months = 6,
): Array<{ label: string; amount: number }> {
  const expenses = transactions.filter(
    (tx) => tx.type === 'expense' && tx.merchantGroupId === groupId,
  );

  const buckets = new Map<string, number>();
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, 0);
  }

  for (const tx of expenses) {
    const key = monthKey(tx.date);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + tx.amount);
    }
  }

  return [...buckets.entries()].map(([label, amount]) => ({
    label: label.slice(5),
    amount,
  }));
}

export function averagePurchasesPerMonth(
  groupId: string,
  transactions: Transaction[],
): number {
  const related = transactions.filter(
    (tx) => tx.type === 'expense' && tx.merchantGroupId === groupId,
  );
  if (related.length === 0) return 0;

  const months = new Set(related.map((tx) => monthKey(tx.date)));
  return related.length / Math.max(months.size, 1);
}
