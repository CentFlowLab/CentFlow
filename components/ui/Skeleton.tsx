import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius } from '@/lib/theme';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  circle?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  circle = false,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  const resolvedRadius = circle ? height / 2 : borderRadius;

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius: resolvedRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

type SkeletonGroupProps = {
  children: React.ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonGroup({ children, gap = 8, style }: SkeletonGroupProps) {
  return <View style={[styles.group, { gap }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceHighlight,
  },
  group: {
    width: '100%',
  },
});
