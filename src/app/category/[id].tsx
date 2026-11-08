import { useLocalSearchParams } from 'expo-router';

import { CategoryFormScreen } from '@/features/categories/CategoryFormScreens';

export default function EditCategoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CategoryFormScreen id={id} />;
}
