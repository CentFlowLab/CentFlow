import type { CategoryType } from './types';

export type DefaultCategoryKey =
  | 'housing'
  | 'groceries'
  | 'dining'
  | 'transport'
  | 'health'
  | 'leisure'
  | 'shopping'
  | 'bills'
  | 'education'
  | 'otherExpense'
  | 'salary'
  | 'freelance'
  | 'investmentIncome'
  | 'gifts'
  | 'otherIncome';

export type DefaultCategory = {
  key: DefaultCategoryKey;
  type: CategoryType;
  icon: string;
  color: string;
};

/** Categorias criadas no primeiro arranque; os nomes são traduzidos pela interface. */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { key: 'housing', type: 'expense', icon: 'home-outline', color: 'indigo' },
  { key: 'groceries', type: 'expense', icon: 'cart-outline', color: 'green' },
  { key: 'dining', type: 'expense', icon: 'restaurant-outline', color: 'orange' },
  { key: 'transport', type: 'expense', icon: 'bus-outline', color: 'blue' },
  { key: 'health', type: 'expense', icon: 'medkit-outline', color: 'red' },
  { key: 'leisure', type: 'expense', icon: 'film-outline', color: 'purple' },
  { key: 'shopping', type: 'expense', icon: 'bag-handle-outline', color: 'pink' },
  { key: 'bills', type: 'expense', icon: 'flash-outline', color: 'amber' },
  { key: 'education', type: 'expense', icon: 'school-outline', color: 'teal' },
  { key: 'otherExpense', type: 'expense', icon: 'ellipsis-horizontal', color: 'slate' },
  { key: 'salary', type: 'income', icon: 'briefcase-outline', color: 'green' },
  { key: 'freelance', type: 'income', icon: 'laptop-outline', color: 'blue' },
  { key: 'investmentIncome', type: 'income', icon: 'trending-up-outline', color: 'teal' },
  { key: 'gifts', type: 'income', icon: 'gift-outline', color: 'pink' },
  { key: 'otherIncome', type: 'income', icon: 'ellipsis-horizontal', color: 'slate' },
];
