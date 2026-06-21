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
import { colors, typography } from '@/lib/theme';

import { Text } from '@/components/ui/Text';

/** Asset oficial fornecido pelo utilizador — não substituir nem regenerar. */
const ANALYSIS_TAB_ICON = require('@/assets/navigation/analysis-tab-icon.png');

const ANIM_DURATION = 220;
/** Emblema hexagonal ocupa ~52% superior do PNG. */
const EMBLEM_TOP_RATIO = 0.52;

const ACTIVE_GLOW = 80;
const INACTIVE_GLOW = 70;

type TabBarAnalisesTabProps = {
  focused: boolean;
  label?: string;
};

const AnalysisIcon = memo(function AnalysisIcon({
  emblemSize,
}: {
  emblemSize: number;
}) {
  const imageWidth = emblemSize;
  const imageHeight = emblemSize / EMBLEM_TOP_RATIO;
  const topNudge = -(imageHeight * (1 - EMBLEM_TOP_RATIO) * 0.04);

  return (
    <View
      style={[
        styles.analysisIconClip,
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

function TabBarAnalisesTabComponent({
  focused,
  label = 'Análises',
}: TabBarAnalisesTabProps) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: ANIM_DURATION });
  }, [focused, progress]);

  const circleContainerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [-ANALYSIS_TAB_LIFT.inactive, -ANALYSIS_TAB_LIFT.active],
        ),
      },
      { scale: interpolate(progress.value, [0, 1], [1, 1.04]) },
    ],
  }));

  const circleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.82, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.97, 1]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.28, 0.48]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.96, 1.06]) }],
  }));

  const emblemSize = focused
    ? ANALYSIS_TAB_EMBLEM.active
    : ANALYSIS_TAB_EMBLEM.inactive;
  const circleSize = focused
    ? ANALYSIS_TAB_CIRCLE.active
    : ANALYSIS_TAB_CIRCLE.inactive;
  const glowSize = focused ? ACTIVE_GLOW : INACTIVE_GLOW;

  return (
    <View style={styles.analysisTabWrapper} pointerEvents="none">
      <Animated.View
        style={[
          styles.analysisCircleContainer,
          { width: circleSize, height: circleSize },
          circleContainerStyle,
        ]}>
        <Animated.View
          style={[
            styles.analysisGlow,
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
            styles.analysisCircle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
            },
            circleStyle,
          ]}
        />
        <View style={styles.analysisIcon}>
          <AnalysisIcon emblemSize={emblemSize} />
        </View>
      </Animated.View>

      <Text
        variant="caption"
        style={[
          typography.tabLabel,
          styles.analysisLabel,
          {
            color: focused ? colors.primary : colors.textMuted,
            fontWeight: focused ? '700' : '500',
            opacity: focused ? 1 : 0.9,
          },
        ]}>
        {label}
      </Text>
    </View>
  );
}

/** Tab central premium — ícone elevado + círculo + glow + label. */
export const TabBarAnalisesTab = memo(TabBarAnalisesTabComponent);

/** @deprecated Usar TabBarAnalisesTab */
export const TabBarAnalisesIcon = TabBarAnalisesTab;

const styles = StyleSheet.create({
  analysisTabWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: ANALYSIS_TAB_CIRCLE.active + 8,
    minHeight: ANALYSIS_TAB_CIRCLE.active + 22,
    overflow: 'visible',
  },
  analysisCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: Platform.OS === 'android' ? 6 : 0,
  },
  analysisGlow: {
    position: 'absolute',
    backgroundColor: colors.primaryGlow,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 14,
    elevation: Platform.OS === 'android' ? 5 : 0,
  },
  analysisCircle: {
    position: 'absolute',
    backgroundColor: '#0A101A',
    borderWidth: 1.5,
    borderColor: 'rgba(94, 234, 212, 0.38)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 4 : 0,
  },
  analysisIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  analysisIconClip: {
    overflow: 'hidden',
  },
  analysisLabel: {
    marginTop: 6,
    zIndex: 1,
  },
});
