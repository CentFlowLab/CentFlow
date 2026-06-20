import { Platform, View, type ViewStyle } from 'react-native';

import { useTabBarMetrics } from '@/hooks/useTabBarMetrics';
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
  hidden?: boolean;
  [key: string]: unknown;
};

/**
 * Tab bar com safe area inferior dinâmica (Android edge-to-edge + iOS home indicator).
 */
export function CentFlowTabBar(props: CentFlowTabBarProps) {
  const { hidden, ...rest } = props;
  const { contentHeight, bottomInset, totalHeight } = useTabBarMetrics();

  if (hidden) {
    return null;
  }

  const wrapperStyle: ViewStyle = {
    backgroundColor: colors.tabBar,
    paddingBottom: bottomInset,
    minHeight: totalHeight,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: colors.tabBarBorder,
  };

  return (
    <View style={wrapperStyle}>
      <BottomTabBar
        {...rest}
        insets={{ ...rest.insets, bottom: 0 }}
        style={[
          {
            backgroundColor: colors.tabBar,
            height: contentHeight,
            minHeight: contentHeight,
            paddingBottom: 0,
            paddingTop: 0,
          },
          rest.style,
        ]}
      />
    </View>
  );
}
