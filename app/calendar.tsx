import { Stack, router } from 'expo-router';
import { Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { FinancialCalendarScreen } from '@/components/calendar';
import { ScreenContainer } from '@/components/ui';
import { colors } from '@/lib/theme';

export default function CalendarScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Calendário de caixa',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Voltar">
              <SymbolView
                name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                tintColor={colors.text}
                size={22}
              />
            </Pressable>
          ),
        }}
      />
      <ScreenContainer applyBottomSafeInset>
        <FinancialCalendarScreen />
      </ScreenContainer>
    </>
  );
}
