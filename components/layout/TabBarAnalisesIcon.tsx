import { memo, useEffect } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/lib/theme';

/** Asset oficial fornecido pelo utilizador - nao substituir nem regenerar. */
const ANALYSIS_TAB_ICON = require('@/assets/navigation/analysis-tab-icon.png');

const ANIM_DURATION = 200;
const EMBLEM_HEIGHT_RATIO = 2;
const ACTIVE_CIRCLE_SIZE = 54;
const INACTIVE_CIRCLE_SIZE = 46;

type TabBarAnalisesIconProps = {
  focused: boolean;
};

function resolveTabSizes(focused: boolean) {
  const circle = focused ? ACTIVE_CIRCLE_SIZE : INACTIVE_CIRCLE_SIZE;
  const emblem = focused ? 38 : 32;
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
  const { circle, emblem } = resolveTabSizes(focused);

  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: ANIM_DURATION });
  }, [focused, progress]);

  const clusterStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.82, 1]),
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.98, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [1, -3]) },
    ],
  }));

  const circleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.72, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.96, 1]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.08, 0.42]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.9, 1.08]) }],
  }));

  const imageOpacity = focused ? 1 : 0.76;

  return (
    <View style={styles.wrapper}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: circle + 10,
            height: circle + 10,
            borderRadius: (circle + 10) / 2,
          },
          glowStyle,
        ]}
      />
      <Animated.View style={clusterStyle}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.circle,
            {
              width: circle,
              height: circle,
              borderRadius: circle / 2,
            },
            circleStyle,
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
    width: 64,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.primaryGlow,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 5 : 0,
  },
  circle: {
    position: 'absolute',
    backgroundColor: 'rgba(14, 20, 30, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.22)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: Platform.OS === 'android' ? 3 : 0,
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
