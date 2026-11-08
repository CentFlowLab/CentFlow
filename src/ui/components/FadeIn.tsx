import { useEffect, useState, type PropsWithChildren } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { durations } from '../theme';

type Props = PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>;

/** Entrada subtil (opacidade + deslocamento curto). Respeita "reduzir movimento". */
export function FadeIn({ children, delay = 0, style }: Props) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        progress.setValue(1);
        return;
      }
      Animated.timing(progress, {
        toValue: 1,
        duration: durations.slow,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [delay, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
}
