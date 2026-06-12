import type { SymbolViewProps } from 'expo-symbols';

import type { TransactionType } from '@/lib/domain/transaction.types';

export type TransactionCategory = {
  id: string;
  label: string;
  icon: SymbolViewProps['name'];
};

export const EXPENSE_CATEGORIES: TransactionCategory[] = [
  { id: 'food', label: 'Alimentação', icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' } },
  { id: 'transport', label: 'Transportes', icon: { ios: 'car.fill', android: 'directions_car', web: 'directions_car' } },
  { id: 'housing', label: 'Habitação', icon: { ios: 'house.fill', android: 'home', web: 'home' } },
  { id: 'shopping', label: 'Compras', icon: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' } },
  { id: 'health', label: 'Saúde', icon: { ios: 'heart.fill', android: 'favorite', web: 'favorite' } },
  { id: 'leisure', label: 'Lazer', icon: { ios: 'gamecontroller.fill', android: 'sports_esports', web: 'sports_esports' } },
  { id: 'subscriptions', label: 'Subscrições', icon: { ios: 'repeat', android: 'autorenew', web: 'autorenew' } },
  { id: 'other', label: 'Outros', icon: { ios: 'ellipsis.circle.fill', android: 'more_horiz', web: 'more_horiz' } },
];

export const INCOME_CATEGORIES: TransactionCategory[] = [
  { id: 'salary', label: 'Salário', icon: { ios: 'banknote.fill', android: 'payments', web: 'payments' } },
  { id: 'freelance', label: 'Freelance', icon: { ios: 'laptopcomputer', android: 'laptop', web: 'laptop' } },
  { id: 'investment', label: 'Investimentos', icon: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' } },
  { id: 'refund', label: 'Reembolso', icon: { ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' } },
  { id: 'other', label: 'Outros', icon: { ios: 'ellipsis.circle.fill', android: 'more_horiz', web: 'more_horiz' } },
];

export function getCategoriesForType(type: TransactionType): TransactionCategory[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function getCategoryLabel(categoryId: string, type: TransactionType): string {
  const categories = getCategoriesForType(type);
  return categories.find((c) => c.id === categoryId)?.label ?? categoryId;
}

export function getCategoryById(
  categoryId: string,
  type: TransactionType,
): TransactionCategory | undefined {
  return getCategoriesForType(type).find((c) => c.id === categoryId);
}
