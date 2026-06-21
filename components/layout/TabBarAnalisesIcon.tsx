import { memo, useEffect } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/lib/theme';

/** Asset premium v2 — ícone centrado com glow integrado. */
const ANALYSIS_TAB_ICON = require('@/assets/navigation/analysis-tab-icon-v2.png');

const ANIM_DURATION = 220;
const OUTER_SIZE = 68;
const INNER_SIZE = 58;
const ICON_SIZE = 36;
const ICON_SLOT_HEIGHT = 28;

type TabBarAnalisesIconProps = {
  focused: boolean;
};

function TabBarAnalisesIconComponent({ focused }: TabBarAnalisesIconProps) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: ANIM_DURATION });
  }, [focused, progress]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.28]),
  }));

  const innerCircleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.9, 1]),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(94, 234, 212, 0.2)', 'rgba(94, 234, 212, 0.36)'],
    ),
  }));

  return (
    <View style={styles.iconSlot} pointerEvents="none">
      <View style={styles.outer}>
        <Animated.View style={[styles.layer, styles.glow, glowStyle]} />
        <Animated.View style={[styles.layer, styles.innerCircle, innerCircleStyle]} />
        <View style={[styles.layer, styles.iconLayer]}>
          <Image
            source={ANALYSIS_TAB_ICON}
            style={styles.icon}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
      </View>
    </View>
  );
}

export const TabBarAnalisesIcon = memo(TabBarAnalisesIconComponent);

const styles = StyleSheet.create({
  iconSlot: {
    width: OUTER_SIZE,
    height: ICON_SLOT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  outer: {
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: Platform.OS === 'android' ? 4 : 0,
  },
  layer: {
    position: 'absolute',
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    borderRadius: OUTER_SIZE / 2,
    backgroundColor: colors.primaryGlow,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
  innerCircle: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: INNER_SIZE / 2,
    backgroundColor: 'rgba(10, 16, 26, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.24)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
  iconLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
});
