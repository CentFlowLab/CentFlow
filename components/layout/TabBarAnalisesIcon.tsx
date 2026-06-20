import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AnalysisIconMark } from '@/components/icons/AnalysisIconMark';
import { colors } from '@/lib/theme';

const ANIM_DURATION = 200;
const ICON_SIZE = 26;
const ICON_SIZE_FOCUSED = 28;

type TabBarAnalisesIconProps = {
  focused: boolean;
};

function TabBarAnalisesIconComponent({ focused }: TabBarAnalisesIconProps) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: ANIM_DURATION });
  }, [focused, progress]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.72, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.05]) }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.5]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.85, 1.08]) }],
  }));

  const size = focused ? ICON_SIZE_FOCUSED : ICON_SIZE;

  return (
    <View style={styles.wrapper}>
      <Animated.View pointerEvents="none" style={[styles.glow, glowAnimatedStyle]} />
      <Animated.View style={iconAnimatedStyle}>
        <AnalysisIconMark size={size} active={focused} />
      </Animated.View>
    </View>
  );
}

export const TabBarAnalisesIcon = memo(TabBarAnalisesIconComponent);

const styles = StyleSheet.create({
  wrapper: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryGlow,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
});
