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

/** Asset oficial fornecido pelo utilizador — não substituir nem regenerar. */
const ANALYSIS_TAB_ICON = require('@/assets/navigation/analysis-tab-icon.png');

const ANIM_DURATION = 200;
const EMBLEM_HEIGHT_RATIO = 2;

type TabBarAnalisesIconProps = {
  focused: boolean;
};

function resolveIconSize(focused: boolean) {
  return focused ? 28 : 24;
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
  const emblem = resolveIconSize(focused);

  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: ANIM_DURATION });
  }, [focused, progress]);

  const clusterStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.86, 1]),
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 1.03]) },
      { translateY: interpolate(progress.value, [0, 1], [0, -1]) },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.22]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.95, 1]) }],
  }));

  const imageOpacity = focused ? 1 : 0.86;

  return (
    <View style={styles.wrapper}>
      <Animated.View
        pointerEvents="none"
        style={[styles.glow, glowStyle]}
      />
      <Animated.View style={clusterStyle}>
        <View style={styles.emblemCenter}>
          <AnalysisTabAsset emblemSize={emblem} opacity={imageOpacity} />
        </View>
      </Animated.View>
    </View>
  );
}

export const TabBarAnalisesIcon = memo(TabBarAnalisesIconComponent);

const styles = StyleSheet.create({
  wrapper: {
    width: 34,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 22,
    height: 3,
    bottom: 1,
    borderRadius: 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: Platform.OS === 'android' ? 1 : 0,
  },
  emblemCenter: {
    width: 30,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemClip: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});
