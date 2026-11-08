import type { Account, Category, Id } from '@/core/finance';
import { useDataQuery, type Repositories } from '@/data';

export type FinanceLookups = {
  /** Inclui contas arquivadas (para mostrar movimentos antigos). */
  accounts: ReadonlyMap<Id, Account>;
  categories: ReadonlyMap<Id, Category>;
  accountList: readonly Account[];
  categoryList: readonly Category[];
};

async function loadLookups(repositories: Repositories): Promise<FinanceLookups> {
  const [accountList, categoryList] = [
    await repositories.accounts.list({ includeArchived: true }),
    await repositories.categories.list(),
  ];
  return {
    accounts: new Map(accountList.map((account) => [account.id, account])),
    categories: new Map(categoryList.map((category) => [category.id, category])),
    accountList,
    categoryList,
  };
}

/** Contas e categorias atuais, para dar nome e cor aos movimentos. */
export function useFinanceLookups() {
  return useDataQuery(loadLookups);
}
