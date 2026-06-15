import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabIcon } from '@/components/icons/TabIcon';
import { TabBarAnalisesIcon } from '@/components/layout';
import { colors, typography } from '@/lib/theme';

const TAB_BAR_CONTENT_HEIGHT = Platform.OS === 'ios' ? 56 : 52;
/** Fallback quando edge-to-edge não reporta inset inferior (alguns Android). */
const ANDROID_NAV_BAR_FALLBACK = 24;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, ANDROID_NAV_BAR_FALLBACK)
      : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          ...styles.tabBar,
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
          paddingBottom: bottomInset,
        },
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
  tabBar: {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.tabBarBorder,
    borderTopWidth: 1,
    paddingTop: 8,
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
