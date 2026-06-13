import { Tabs, useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { TabIcon } from '@/components/icons/TabIcon';
import { TabBarAnalisesIcon } from '@/components/layout';
import { useOnboarding } from '@/hooks/useOnboarding';
import { colors, typography } from '@/lib/theme';

export default function TabLayout() {
  const router = useRouter();
  const { completed, isLoading } = useOnboarding();

  useEffect(() => {
    if (!isLoading && completed === false) {
      router.replace('/onboarding' as Href);
    }
  }, [completed, isLoading, router]);

  if (isLoading || completed === false) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: typography.tabLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={{
                ios: 'house.fill',
                android: 'home',
                web: 'home',
              }}
              color={color}
              size={focused ? 26 : 24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="movimentos"
        options={{
          title: 'Movimentos',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={{
                ios: 'arrow.left.arrow.right',
                android: 'swap_horiz',
                web: 'swap_horiz',
              }}
              color={color}
              size={focused ? 26 : 24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analises"
        options={{
          title: 'Análises',
          tabBarIcon: ({ focused }) => <TabBarAnalisesIcon focused={focused} />,
          tabBarLabelStyle: [typography.tabLabel, styles.analisesLabel],
          tabBarItemStyle: [styles.tabBarItem, styles.analisesItem],
        }}
      />
      <Tabs.Screen
        name="precos"
        options={{
          title: 'Preços',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={{
                ios: 'tag.fill',
                android: 'sell',
                web: 'sell',
              }}
              color={color}
              size={focused ? 26 : 24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ativos"
        options={{
          title: 'Ativos',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={{
                ios: 'archivebox.fill',
                android: 'inventory_2',
                web: 'inventory_2',
              }}
              color={color}
              size={focused ? 26 : 24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.tabBarBorder,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarItem: {
    paddingTop: 4,
  },
  analisesItem: {
    marginTop: -8,
  },
  analisesLabel: {
    marginTop: 4,
    fontWeight: '600',
    color: colors.primary,
  },
});
