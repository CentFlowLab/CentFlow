import { Tabs } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { CentFlowTabBar } from '@/components/layout/CentFlowTabBar';
import { TabIcon } from '@/components/icons/TabIcon';
import { TabBarAnalisesIcon } from '@/components/layout';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { colors, typography } from '@/lib/theme';

const TAB_BAR_CONTENT_HEIGHT = Platform.OS === 'ios' ? 56 : 52;

export default function TabLayout() {
  return <TabLayoutInner />;
}

function TabLayoutInner() {
  const keyboardVisible = useKeyboardVisible();

  return (
    <Tabs
      tabBar={(props) => <CentFlowTabBar {...props} hidden={keyboardVisible} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: keyboardVisible
          ? styles.tabBarHidden
          : {
              ...styles.tabBar,
              minHeight: TAB_BAR_CONTENT_HEIGHT,
              paddingBottom: 0,
              overflow: 'visible' as const,
            },
        tabBarLabelStyle: typography.tabLabel,
        tabBarLabel: ({ focused, color, children }) => (
          <Text
            style={[
              typography.tabLabel,
              {
                color,
                fontWeight: focused ? '600' : '400',
              },
            ]}>
            {children}
          </Text>
        ),
        tabBarItemStyle: styles.tabBarItem,
        tabBarButton: Platform.OS === 'android'
          ? (props) => <TabBarButtonAndroid {...(props as PressableProps)} />
          : undefined,
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
          title: 'Créditos',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={{
                ios: 'creditcard.fill',
                android: 'credit_card',
                web: 'credit_card',
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

function TabBarButtonAndroid(props: PressableProps) {
  const { style, ...rest } = props;

  return (
    <Pressable
      {...rest}
      android_ripple={{
        color: `${colors.primary}33`,
        borderless: true,
        radius: 28,
      }}
      style={(state) => [typeof style === 'function' ? style(state) : style, { overflow: 'visible' }]}
    />
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
  tabBarHidden: {
    display: 'none',
    height: 0,
    overflow: 'hidden',
  },
  tabBarItem: {
    paddingTop: 4,
    overflow: 'visible',
  },
  analisesItem: {
    marginTop: -2,
    overflow: 'visible',
  },
  analisesLabel: {
    marginTop: 2,
    fontWeight: '600',
  },
});
