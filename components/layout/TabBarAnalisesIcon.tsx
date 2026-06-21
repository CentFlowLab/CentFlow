import { memo, useEffect } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
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
/** Emblema hexagonal ocupa ~52% superior do PNG quadrado. */
const EMBLEM_IMAGE_HEIGHT_RATIO = 1 / 0.52;
const IMAGE_TOP_NUDGE_RATIO = -0.04;

const ACTIVE_EMBLEM = 40;
const INACTIVE_EMBLEM = 34;
const ACTIVE_CIRCLE = 50;
const ACTIVE_GLOW = 54;

type TabBarAnalisesIconProps = {
  focused: boolean;
};

const AnalysisTabAsset = memo(function AnalysisTabAsset({
  emblemSize,
  opacity,
}: {
  emblemSize: number;
  opacity: number;
}) {
  const imageHeight = emblemSize * EMBLEM_IMAGE_HEIGHT_RATIO;
  const topNudge = emblemSize * IMAGE_TOP_NUDGE_RATIO;

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
          height: imageHeight,
          marginTop: topNudge,
        }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
});

function TabBarAnalisesIconComponent({ focused }: TabBarAnalisesIconProps) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: ANIM_DURATION });
  }, [focused, progress]);

  const emblemStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.72, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.06]) }],
  }));

  const circleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.92, 1]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.28]),
  }));

  const emblemSize = focused ? ACTIVE_EMBLEM : INACTIVE_EMBLEM;

  return (
    <View style={styles.wrapper}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: ACTIVE_GLOW,
            height: ACTIVE_GLOW,
            borderRadius: ACTIVE_GLOW / 2,
          },
          glowStyle,
        ]}
      />
      <Animated.View style={[styles.iconStack, emblemStyle]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.circle,
            {
              width: ACTIVE_CIRCLE,
              height: ACTIVE_CIRCLE,
              borderRadius: ACTIVE_CIRCLE / 2,
            },
            circleStyle,
          ]}
        />
        <View style={[styles.emblemCenter, { width: ACTIVE_CIRCLE, height: ACTIVE_CIRCLE }]}>
          <AnalysisTabAsset emblemSize={emblemSize} opacity={1} />
        </View>
      </Animated.View>
    </View>
  );
}

export const TabBarAnalisesIcon = memo(TabBarAnalisesIconComponent);

const styles = StyleSheet.create({
  wrapper: {
    width: 52,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.primaryGlow,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
  iconStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    backgroundColor: 'rgba(14, 20, 30, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.28)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: Platform.OS === 'android' ? 2 : 0,
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
