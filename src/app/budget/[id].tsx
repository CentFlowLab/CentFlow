import { useLocalSearchParams } from 'expo-router';

import { BudgetDetailScreen } from '@/features/budgets/BudgetScreens';

export default function BudgetDetailRoute() {
  const { id, on } = useLocalSearchParams<{ id: string; on?: string }>();
  const reference = Array.isArray(on) ? on[0] : on;
  return <BudgetDetailScreen id={id} reference={reference} />;
}
