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
/** Emblema hexagonal ocupa ~52% superior do PNG. */
const EMBLEM_TOP_RATIO = 0.52;

const INACTIVE_EMBLEM = 24;
const ACTIVE_EMBLEM = 28;
const ACTIVE_RING = 36;
const ACTIVE_GLOW = 40;

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
  const topNudge = -(imageHeight * (1 - EMBLEM_TOP_RATIO) * 0.08);

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

  const emblemStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.5, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.04]) }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.94, 1]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.22]),
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
            styles.ring,
            {
              width: ACTIVE_RING,
              height: ACTIVE_RING,
              borderRadius: ACTIVE_RING / 2,
            },
            ringStyle,
          ]}
        />
        <View style={styles.emblemCenter}>
          <AnalysisTabAsset emblemSize={emblemSize} />
        </View>
      </Animated.View>
    </View>
  );
}

export const TabBarAnalisesIcon = memo(TabBarAnalisesIconComponent);

const styles = StyleSheet.create({
  wrapper: {
    width: 40,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.primaryGlow,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: Platform.OS === 'android' ? 1 : 0,
  },
  iconStack: {
    width: ACTIVE_RING,
    height: ACTIVE_RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    backgroundColor: 'rgba(14, 20, 30, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.24)',
  },
  emblemCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemClip: {
    overflow: 'hidden',
  },
});
