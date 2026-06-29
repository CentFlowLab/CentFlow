import { normalize } from '@/lib/merchants/fuzzy-match';
import type { MerchantGroup } from '@/lib/domain/merchant-group.types';
import type { Transaction } from '@/lib/domain/transaction.types';

/** Pesquisa em description, merchant e aliases de grupos do utilizador. */
export function filterTransactionsBySearch(
  transactions: Transaction[],
  query: string,
  groups: MerchantGroup[],
): Transaction[] {
  const q = normalize(query);
  if (!q) return transactions;

  const groupById = new Map(groups.map((g) => [g.id, g]));
  const aliasMatchGroupIds = new Set<string>();

  for (const group of groups) {
    const nameMatch = normalize(group.name).includes(q);
    const aliasMatch = group.aliases.some((alias) => normalize(alias).includes(q));
    if (nameMatch || aliasMatch) {
      aliasMatchGroupIds.add(group.id);
    }
  }

  return transactions.filter((tx) => {
    const desc = tx.description?.trim();
    if (desc && normalize(desc).includes(q)) return true;
    const merchant = tx.merchant?.trim();
    if (merchant && normalize(merchant).includes(q)) return true;
    if (tx.merchantGroupId && aliasMatchGroupIds.has(tx.merchantGroupId)) return true;
    if (tx.merchantGroupId) {
      const group = groupById.get(tx.merchantGroupId);
      if (group && normalize(group.name).includes(q)) return true;
    }
    return false;
  });
}

export function getMerchantGroupName(
  groupId: string | null | undefined,
  groups: MerchantGroup[],
): string | undefined {
  if (!groupId) return undefined;
  return groups.find((g) => g.id === groupId)?.name;
}
