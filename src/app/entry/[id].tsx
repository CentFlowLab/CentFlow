import { useLocalSearchParams } from 'expo-router';

import { EditEntryScreen } from '@/features/entries/EntryFormScreens';

export default function EditEntryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditEntryScreen id={id} />;
}
