import { memo, useEffect } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ANALYSIS_TAB_LIFT } from '@/lib/layout/device-metrics';
import { colors } from '@/lib/theme';

/** Asset oficial fornecido pelo utilizador — não substituir nem regenerar. */
const ANALYSIS_TAB_ICON = require('@/assets/navigation/analysis-tab-icon.png');

const ANIM_DURATION = 220;
/** Emblema hexagonal ocupa ~52% superior do PNG. */
const EMBLEM_TOP_RATIO = 0.52;

const INACTIVE_EMBLEM = 32;
const ACTIVE_EMBLEM = 38;
const INACTIVE_RING = 46;
const ACTIVE_RING = 54;
const INACTIVE_GLOW = 50;
const ACTIVE_GLOW = 62;

type TabBarAnalisesIconProps = {
  focused: boolean;
};

const AnalysisTabAsset = memo(function AnalysisTabAsset({
  emblemSize,
}: {
  emblemSize: number;
}) {
  const imageWidth = emblemSize;
  const imageHeight = emblemSize / EMBLEM_TOP_RATIO;
  const topNudge = -(imageHeight * (1 - EMBLEM_TOP_RATIO) * 0.06);

  return (
    <View
      style={[
        styles.emblemClip,
        {
          width: emblemSize,
          height: emblemSize,
        },
      ]}>
      <Image
        source={ANALYSIS_TAB_ICON}
        style={{
          width: imageWidth,
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

  const stackStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.78, 1]),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [-ANALYSIS_TAB_LIFT.inactive, -ANALYSIS_TAB_LIFT.active],
        ),
      },
      { scale: interpolate(progress.value, [0, 1], [1, 1.05]) },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.58, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.96, 1]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.18, 0.38]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.94, 1.04]) }],
  }));

  const emblemSize = focused ? ACTIVE_EMBLEM : INACTIVE_EMBLEM;
  const ringSize = focused ? ACTIVE_RING : INACTIVE_RING;
  const glowSize = focused ? ACTIVE_GLOW : INACTIVE_GLOW;

  return (
    <View style={styles.wrapper} pointerEvents="none">
      <Animated.View style={[styles.elevatedStack, stackStyle]}>
        <Animated.View
          style={[
            styles.glow,
            {
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
            },
            glowStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
            },
            ringStyle,
          ]}
        />
        <View style={[styles.emblemCenter, { width: ringSize, height: ringSize }]}>
          <AnalysisTabAsset emblemSize={emblemSize} />
        </View>
      </Animated.View>
    </View>
  );
}

export const TabBarAnalisesIcon = memo(TabBarAnalisesIconComponent);

const styles = StyleSheet.create({
  wrapper: {
    width: ACTIVE_RING,
    height: ACTIVE_RING,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  elevatedStack: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ACTIVE_RING,
    height: ACTIVE_RING,
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.primaryGlow,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 4 : 0,
  },
  ring: {
    position: 'absolute',
    backgroundColor: 'rgba(10, 16, 26, 0.97)',
    borderWidth: 1.5,
    borderColor: 'rgba(94, 234, 212, 0.32)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  emblemCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemClip: {
    overflow: 'hidden',
  },
});
