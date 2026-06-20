import { memo, useEffect, useMemo } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/lib/theme';

/** Asset oficial fornecido pelo utilizador — não substituir nem regenerar. */
const ANALYSIS_TAB_ICON = require('@/assets/navigation/analysis-tab-icon.png');

const ANIM_DURATION = 200;
/** Emblema hexagonal ocupa ~metade superior do PNG (texto fica abaixo). */
const EMBLEM_HEIGHT_RATIO = 2;

type TabBarAnalisesIconProps = {
  focused: boolean;
};

function resolveTabSizes(screenWidth: number, focused: boolean) {
  let circleBase: number;
  if (screenWidth < 360) {
    circleBase = 44;
  } else if (screenWidth < 390) {
    circleBase = 46;
  } else if (screenWidth < 428) {
    circleBase = 50;
  } else {
    circleBase = Platform.OS === 'ios' ? 52 : 50;
  }

  const circle = focused ? circleBase : Math.round(circleBase * 0.94);
  const emblem = Math.round(circle * 0.62);

  return { circle, emblem };
}

const AnalysisTabAsset = memo(function AnalysisTabAsset({
  emblemSize,
  opacity,
}: {
  emblemSize: number;
  opacity: number;
}) {
  return (
    <View
      style={[
        styles.emblemClip,
        {
          width: emblemSize,
          height: emblemSize,
          borderRadius: emblemSize / 2,
          opacity,
        },
      ]}>
      <Image
        source={ANALYSIS_TAB_ICON}
        style={{
          width: emblemSize,
          height: emblemSize * EMBLEM_HEIGHT_RATIO,
        }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
});

function TabBarAnalisesIconComponent({ focused }: TabBarAnalisesIconProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { circle, emblem } = useMemo(
    () => resolveTabSizes(screenWidth, focused),
    [screenWidth, focused],
  );

  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: ANIM_DURATION });
  }, [focused, progress]);

  const clusterStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.82, 1]),
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 1.08]) },
      { translateY: interpolate(progress.value, [0, 1], [0, -2]) },
    ],
  }));

  const premiumBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.9, 1]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.55]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.85, 1.12]) }],
  }));

  const imageOpacity = focused ? 1 : 0.88;

  return (
    <View style={[styles.wrapper, { width: circle + 8, height: circle + 4 }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          { width: circle + 10, height: circle + 10, borderRadius: (circle + 10) / 2 },
          glowStyle,
        ]}
      />
      <Animated.View style={clusterStyle}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.premiumCircle,
            {
              width: circle,
              height: circle,
              borderRadius: circle / 2,
            },
            premiumBgStyle,
          ]}
        />
        <View style={[styles.emblemCenter, { width: circle, height: circle }]}>
          <AnalysisTabAsset emblemSize={emblem} opacity={imageOpacity} />
        </View>
      </Animated.View>
    </View>
  );
}

export const TabBarAnalisesIcon = memo(TabBarAnalisesIconComponent);

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.primaryGlow,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 8 : 0,
  },
  premiumCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.25)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 4 : 0,
  },
  emblemCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemClip: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});
