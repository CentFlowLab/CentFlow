import { Stack } from 'expo-router';

/** Definições — protegidas pelo gate global em app/_layout.tsx (OnboardingGateEffect). */
export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
