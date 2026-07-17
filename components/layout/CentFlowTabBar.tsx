import { View, type ViewStyle } from 'react-native';

import { useTabBarMetrics } from '@/hooks/useTabBarMetrics';
import { useTheme } from '@/lib/theme';

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
 * Tab bar equilibrada — safe area inferior clampada (Android), sem botão central elevado.
 */
export function CentFlowTabBar(props: CentFlowTabBarProps) {
  const { hidden, ...rest } = props;
  const { colors } = useTheme();
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

  const innerStyle: ViewStyle = {
    height: contentHeight,
    minHeight: contentHeight,
    justifyContent: 'center',
    overflow: 'hidden',
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
              height: contentHeight,
              minHeight: contentHeight,
              paddingBottom: 0,
              paddingTop: 0,
              borderTopWidth: 0,
              overflow: 'hidden',
            },
            rest.style,
          ]}
        />
      </View>
    </View>
  );
}
