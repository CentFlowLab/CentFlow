import { DEFAULT_CATEGORIES } from './default-categories';
import { suggestionFor, type HistoryEntry } from './suggestions';
import type { Account, Category, Entry, Id } from './types';

/**
 * Movimentos importados por classificar (ADR-082). Nada aqui grava: são regras puras usadas na
 * importação (banco e extrato) e na lista de Movimentos.
 */

/** Modo da importação: marcar para rever (omissão) ou aplicar as sugestões do histórico. */
export type ImportMode = 'review' | 'suggest';

const OTHER_ID = {
  expense: DEFAULT_CATEGORIES.find((category) => category.key === 'otherExpense')?.id,
  income: DEFAULT_CATEGORIES.find((category) => category.key === 'otherIncome')?.id,
} as const;

/** "Outras despesas" / "Outras receitas" (ou a escolhida), ou a primeira categoria do tipo. */
export function fallbackCategory(
  categories: readonly Pick<Category, 'id' | 'type'>[],
  type: 'expense' | 'income',
  preferred?: Id | null,
): Id | null {
  const ofType = categories.filter((category) => category.type === type);
  return (
    ofType.find((category) => category.id === preferred)?.id ??
    ofType.find((category) => category.id === OTHER_ID[type])?.id ??
    ofType[0]?.id ??
    null
  );
}

/**
 * Categoria de uma linha importada. Modo "rever": a de recurso e por classificar (a sugestão não é
 * aplicada). Modo "aplicar": a sugestão clara do histórico, já revista; sem sugestão, como no modo
 * "rever". `preferred` é a categoria de recurso escolhida na importação de um extrato.
 */
export function importedCategory(
  row: { description: string; type: 'expense' | 'income' },
  history: readonly HistoryEntry[],
  categories: readonly Pick<Category, 'id' | 'type'>[],
  mode: ImportMode,
  preferred?: Id | null,
): { categoryId: Id | null; needsReview: boolean } {
  if (mode === 'suggest') {
    const suggestion = suggestionFor(history, row.description, row.type);
    if (suggestion?.categoryId) return { categoryId: suggestion.categoryId, needsReview: false };
  }
  return { categoryId: fallbackCategory(categories, row.type, preferred), needsReview: true };
}

type ReviewEntry = Pick<
  Entry,
  'id' | 'type' | 'amount' | 'date' | 'accountId' | 'needsReview' | 'loanId' | 'vehicleId'
>;
type ReviewAccount = Pick<Account, 'id' | 'currency' | 'archivedAt'>;

export type EntryPair = { expenseId: Id; incomeId: Id };

function pairs(
  entries: readonly ReviewEntry[],
  accounts: readonly ReviewAccount[],
  sameAccount: boolean,
): EntryPair[] {
  const byId = new Map(accounts.map((account) => [account.id, account]));
  const open = (entry: ReviewEntry) =>
    entry.needsReview && entry.loanId === null && entry.vehicleId === null;
  const expenses = entries.filter((entry) => entry.type === 'expense' && open(entry));
  const incomes = entries.filter((entry) => entry.type === 'income' && open(entry));
  const used = new Set<Id>();
  const found: EntryPair[] = [];
  for (const expense of expenses) {
    const from = byId.get(expense.accountId);
    if (!from) continue;
    const match = incomes.find((income) => {
      if (used.has(income.id)) return false;
      const to = byId.get(income.accountId);
      if (!to || income.amount !== expense.amount || income.date !== expense.date) return false;
      if (sameAccount) return income.accountId === expense.accountId;
      return (
        income.accountId !== expense.accountId &&
        to.currency === from.currency &&
        !from.archivedAt &&
        !to.archivedAt
      );
    });
    if (match) {
      used.add(match.id);
      found.push({ expenseId: expense.id, incomeId: match.id });
    }
  }
  return found;
}

/**
 * Possíveis transferências entre contas próprias: uma despesa por classificar numa conta e uma
 * receita por classificar noutra, mesma moeda, mesmo valor e **mesmo dia** (com datas diferentes, a
 * próxima importação do banco voltaria a trazer a linha), sem empréstimo nem viatura. Cada
 * movimento entra num só par. Nunca se convertem sozinhas.
 */
export function findTransferCandidates(
  entries: readonly ReviewEntry[],
  accounts: readonly ReviewAccount[],
): EntryPair[] {
  return pairs(entries, accounts, false);
}

/** Saída e entrada iguais na mesma conta e no mesmo dia: anulam-se (só uma nota, sem conversão). */
export function findCancellingPairs(
  entries: readonly ReviewEntry[],
  accounts: readonly ReviewAccount[],
): EntryPair[] {
  return pairs(entries, accounts, true);
}
