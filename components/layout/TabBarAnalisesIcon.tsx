import { memo, useEffect } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  ANALYSIS_TAB_CIRCLE,
  ANALYSIS_TAB_EMBLEM,
  ANALYSIS_TAB_LIFT,
} from '@/lib/layout/device-metrics';
import { colors } from '@/lib/theme';

/** Asset oficial fornecido pelo utilizador — não substituir nem regenerar. */
const ANALYSIS_TAB_ICON = require('@/assets/navigation/analysis-tab-icon.png');

const ANIM_DURATION = 220;
/** Emblema hexagonal ocupa ~52% superior do PNG. */
const EMBLEM_TOP_RATIO = 0.52;

const ICON_SLOT_HEIGHT = 28;
const ACTIVE_GLOW = 68;
const INACTIVE_GLOW = 62;

type TabBarAnalisesIconProps = {
  focused: boolean;
};

const AnalysisIcon = memo(function AnalysisIcon({
  emblemSize,
}: {
  emblemSize: number;
}) {
  const imageWidth = emblemSize;
  const imageHeight = emblemSize / EMBLEM_TOP_RATIO;
  const topNudge = -(imageHeight * (1 - EMBLEM_TOP_RATIO) * 0.05);

  return (
    <View
      style={[
        styles.iconClip,
        {
          width: emblemSize,
          height: emblemSize,
          borderRadius: emblemSize / 2,
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

  const elevatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [-ANALYSIS_TAB_LIFT.inactive, -ANALYSIS_TAB_LIFT.active],
        ),
      },
      { scale: interpolate(progress.value, [0, 1], [1, 1.03]) },
    ],
  }));

  const circleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.88, 1]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.22, 0.36]),
  }));

  const emblemSize = focused
    ? ANALYSIS_TAB_EMBLEM.active
    : ANALYSIS_TAB_EMBLEM.inactive;
  const circleSize = focused
    ? ANALYSIS_TAB_CIRCLE.active
    : ANALYSIS_TAB_CIRCLE.inactive;
  const glowSize = focused ? ACTIVE_GLOW : INACTIVE_GLOW;

  return (
    <View style={styles.iconSlot} pointerEvents="none">
      <Animated.View
        style={[
          styles.elevated,
          { width: circleSize, height: circleSize },
          elevatedStyle,
        ]}>
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
            styles.circle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
            },
            circleStyle,
          ]}
        />
        <View style={styles.iconCenter}>
          <AnalysisIcon emblemSize={emblemSize} />
        </View>
      </Animated.View>
    </View>
  );
}

export const TabBarAnalisesIcon = memo(TabBarAnalisesIconComponent);

const styles = StyleSheet.create({
  iconSlot: {
    width: ANALYSIS_TAB_CIRCLE.active,
    height: ICON_SLOT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  elevated: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: Platform.OS === 'android' ? 4 : 0,
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.primaryGlow,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  circle: {
    position: 'absolute',
    backgroundColor: 'rgba(10, 16, 26, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.3)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
  iconCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconClip: {
    overflow: 'hidden',
  },
});
