import { Stack } from 'expo-router';

import { colors } from '@/lib/theme';

/** Documentos legais — acessíveis autenticado ou não. */
export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
