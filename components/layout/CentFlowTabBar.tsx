import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarBottomInset } from '@/hooks/useTabBarBottomInset';
import { colors } from '@/lib/theme';

// Bundled pelo expo-router — evita dependência extra.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BottomTabBar } = require('expo-router/build/react-navigation/bottom-tabs/views/BottomTabBar') as {
  BottomTabBar: React.ComponentType<{
    insets: { top: number; right: number; bottom: number; left: number };
    style?: object;
    [key: string]: unknown;
  }>;
};

type CentFlowTabBarProps = {
  insets: { top: number; right: number; bottom: number; left: number };
  style?: object;
  [key: string]: unknown;
};

/**
 * Tab bar com safe area inferior garantida.
 * Android: fallback generoso (edge-to-edge). iOS: inset nativo do dispositivo.
 */
export function CentFlowTabBar(props: CentFlowTabBarProps) {
  const bottomInset = useTabBarBottomInset();
  const insets = useSafeAreaInsets();
  const paddingBottom = Platform.OS === 'android' ? bottomInset : insets.bottom;

  return (
    <View style={{ backgroundColor: colors.tabBar, paddingBottom }}>
      <BottomTabBar
        {...props}
        insets={{ ...props.insets, bottom: 0 }}
        style={[{ backgroundColor: colors.tabBar }, props.style]}
      />
    </View>
  );
}
