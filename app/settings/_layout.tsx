import { Stack } from 'expo-router';

import { colors } from '@/lib/theme';

/** Definições — protegidas pelo gate global em app/_layout.tsx (OnboardingGateEffect). */
export default function SettingsLayout() {
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
