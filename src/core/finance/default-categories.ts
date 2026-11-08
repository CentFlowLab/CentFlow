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
  /**
   * Identificador fixo, igual em todos os dispositivos e contas: a mesma categoria base criada
   * offline em dois dispositivos é reconhecida como uma só ao sincronizar.
   */
  id: string;
  key: DefaultCategoryKey;
  type: CategoryType;
  icon: string;
  color: string;
};

/** Categorias criadas no primeiro arranque; os nomes são traduzidos pela interface. */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  {
    id: 'cf000000-0000-4000-8000-000000000001',
    key: 'housing',
    type: 'expense',
    icon: 'home-outline',
    color: 'indigo',
  },
  {
    id: 'cf000000-0000-4000-8000-000000000002',
    key: 'groceries',
    type: 'expense',
    icon: 'cart-outline',
    color: 'green',
  },
  {
    id: 'cf000000-0000-4000-8000-000000000003',
    key: 'dining',
    type: 'expense',
    icon: 'restaurant-outline',
    color: 'orange',
  },
  {
    id: 'cf000000-0000-4000-8000-000000000004',
    key: 'transport',
    type: 'expense',
    icon: 'bus-outline',
    color: 'blue',
  },
  {
    id: 'cf000000-0000-4000-8000-000000000005',
    key: 'health',
    type: 'expense',
    icon: 'medkit-outline',
    color: 'red',
  },
  {
    id: 'cf000000-0000-4000-8000-000000000006',
    key: 'leisure',
    type: 'expense',
    icon: 'film-outline',
    color: 'purple',
  },
  {
    id: 'cf000000-0000-4000-8000-000000000007',
    key: 'shopping',
    type: 'expense',
    icon: 'bag-handle-outline',
    color: 'pink',
  },
  {
    id: 'cf000000-0000-4000-8000-000000000008',
    key: 'bills',
    type: 'expense',
    icon: 'flash-outline',
    color: 'amber',
  },
  {
    id: 'cf000000-0000-4000-8000-000000000009',
    key: 'education',
    type: 'expense',
    icon: 'school-outline',
    color: 'teal',
  },
  {
    id: 'cf000000-0000-4000-8000-00000000000a',
    key: 'otherExpense',
    type: 'expense',
    icon: 'ellipsis-horizontal',
    color: 'slate',
  },
  {
    id: 'cf000000-0000-4000-8000-00000000000b',
    key: 'salary',
    type: 'income',
    icon: 'briefcase-outline',
    color: 'green',
  },
  {
    id: 'cf000000-0000-4000-8000-00000000000c',
    key: 'freelance',
    type: 'income',
    icon: 'laptop-outline',
    color: 'blue',
  },
  {
    id: 'cf000000-0000-4000-8000-00000000000d',
    key: 'investmentIncome',
    type: 'income',
    icon: 'trending-up-outline',
    color: 'teal',
  },
  {
    id: 'cf000000-0000-4000-8000-00000000000e',
    key: 'gifts',
    type: 'income',
    icon: 'gift-outline',
    color: 'pink',
  },
  {
    id: 'cf000000-0000-4000-8000-00000000000f',
    key: 'otherIncome',
    type: 'income',
    icon: 'ellipsis-horizontal',
    color: 'slate',
  },
];
