import { Tabs } from 'expo-router';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type PressableStateCallbackType,
} from 'react-native';

import { CentFlowTabBar } from '@/components/layout/CentFlowTabBar';
import { TabIcon } from '@/components/icons/TabIcon';
import { TabBarAnalisesTab } from '@/components/layout';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { useTabBarMetrics } from '@/hooks/useTabBarMetrics';
import { colors, spacing, typography } from '@/lib/theme';

export default function TabLayout() {
  return <TabLayoutInner />;
}

function TabLayoutInner() {
  const keyboardVisible = useKeyboardVisible();
  const { contentHeight } = useTabBarMetrics();

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
              height: contentHeight,
              minHeight: contentHeight,
              paddingBottom: 0,
              paddingTop: 0,
              overflow: 'visible',
            },
        tabBarLabelStyle: typography.tabLabel,
        tabBarLabel: ({ focused, color, children }) => (
          <Text
            style={[
              typography.tabLabel,
              styles.tabLabel,
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
          tabBarShowLabel: false,
          tabBarIcon: ({ focused }) => <TabBarAnalisesTab focused={focused} />,
          tabBarItemStyle: styles.analisesTabItem,
          tabBarButton: (props) => (
            <TabBarAnalisesButton {...(props as PressableProps)} />
          ),
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

function TabBarAnalisesButton(props: PressableProps) {
  const { style, children, ...rest } = props;

  return (
    <Pressable
      {...rest}
      android_ripple={{
        color: `${colors.primary}36`,
        borderless: true,
        radius: 38,
      }}
      hitSlop={{ top: 4, bottom: 0, left: 6, right: 6 }}
      style={(state) => [
        styles.analisesTabButton,
        typeof style === 'function' ? style(state) : style,
      ]}>
      {(state) => (
        <View style={styles.analisesTabContent}>
          {renderPressableChildren(children, state)}
        </View>
      )}
    </Pressable>
  );
}

function TabBarButtonAndroid(props: PressableProps) {
  const { style, children, ...rest } = props;

  return (
    <Pressable
      {...rest}
      android_ripple={{
        color: `${colors.primary}28`,
        borderless: false,
      }}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      style={(state) => [
        styles.tabButton,
        typeof style === 'function' ? style(state) : style,
      ]}>
      {(state) => (
        <View style={styles.tabButtonContent}>
          {renderPressableChildren(children, state)}
        </View>
      )}
    </Pressable>
  );
}

function renderPressableChildren(
  children: PressableProps['children'],
  state: PressableStateCallbackType,
) {
  return typeof children === 'function' ? children(state) : children;
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.tabBarBorder,
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarHidden: {
    display: 'none',
    height: 0,
    overflow: 'hidden',
  },
  tabBarItem: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'android' ? spacing.xs : spacing.sm,
  },
  analisesTabItem: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'android' ? 0 : spacing.xs,
    overflow: 'visible',
  },
  tabLabel: {
    marginTop: 2,
  },
  analisesTabButton: {
    flex: 1,
    alignSelf: 'stretch',
    overflow: 'visible',
  },
  analisesTabContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  tabButton: {
    flex: 1,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  tabButtonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
