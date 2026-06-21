import { Platform, View, type ViewStyle } from 'react-native';

import { useTabBarMetrics } from '@/hooks/useTabBarMetrics';
import { colors, spacing } from '@/lib/theme';

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
 * Tab bar com safe area inferior dinâmica e espaço para botão central elevado (Análises).
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
    overflow: 'visible',
    borderTopWidth: 1,
    borderTopColor: colors.tabBarBorder,
  };

  const innerStyle: ViewStyle = {
    height: contentHeight,
    minHeight: contentHeight,
    justifyContent: 'flex-end',
    paddingTop: spacing.sm,
    overflow: 'visible',
  };

  return (
    <View style={wrapperStyle}>
      <View style={innerStyle}>
        <BottomTabBar
          {...rest}
          insets={{ ...rest.insets, bottom: 0 }}
          style={[
            {
              backgroundColor: colors.tabBar,
              height: contentHeight - spacing.sm,
              minHeight: contentHeight - spacing.sm,
              paddingBottom: 0,
              paddingTop: 0,
              borderTopWidth: 0,
              overflow: 'visible',
            },
            rest.style,
          ]}
        />
      </View>
    </View>
  );
}
