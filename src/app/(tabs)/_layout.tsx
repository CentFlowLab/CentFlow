import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppTabBar } from '@/features/navigation/components/AppTabBar';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { useTheme } from '@/ui/theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const breakpoint = useBreakpoint();

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: breakpoint === 'compact' ? 'bottom' : 'left',
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: t('nav.dashboard') }} />
      <Tabs.Screen name="transactions" options={{ title: t('nav.transactions') }} />
      <Tabs.Screen name="accounts" options={{ title: t('nav.accounts') }} />
      <Tabs.Screen name="budgets" options={{ title: t('nav.budgets') }} />
      <Tabs.Screen name="subscriptions" options={{ title: t('nav.subscriptions') }} />
      <Tabs.Screen name="goals" options={{ title: t('nav.goals') }} />
      <Tabs.Screen name="reports" options={{ title: t('nav.reports') }} />
      <Tabs.Screen name="wealth" options={{ title: t('nav.wealth') }} />
      <Tabs.Screen name="vehicles" options={{ title: t('nav.vehicles') }} />
      <Tabs.Screen name="documents" options={{ title: t('nav.documents') }} />
      <Tabs.Screen name="categories" options={{ title: t('nav.categories') }} />
      <Tabs.Screen name="settings" options={{ title: t('nav.settings') }} />
      <Tabs.Screen name="more" options={{ title: t('nav.more') }} />
    </Tabs>
  );
}
