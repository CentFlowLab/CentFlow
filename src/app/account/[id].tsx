import { useLocalSearchParams } from 'expo-router';

import { EditAccountScreen } from '@/features/accounts/AccountFormScreens';

export default function EditAccountRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditAccountScreen id={id} />;
}
