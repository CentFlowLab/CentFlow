import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text as RNText } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type AnimatedCurrencyProps = {
  value: number;
  formatter: (value: number) => string;
  style?: object;
  duration?: number;
};

const AnimatedText = Animated.createAnimatedComponent(RNText);

function sanitizeAmount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value;
}

export function AnimatedCurrency({
  value,
  formatter,
  style,
  duration = 600,
}: AnimatedCurrencyProps) {
  const safeValue = sanitizeAmount(value);
  const animated = useSharedValue(safeValue);

  const formatValue = useCallback(
    (raw: number) => {
      try {
        const rounded = Math.round(sanitizeAmount(raw) * 100) / 100;
        return formatter(rounded);
      } catch {
        return '—';
      }
    },
    [formatter],
  );

  const [display, setDisplay] = useState(() => formatValue(safeValue));

  const syncDisplay = useCallback(
    (raw: number) => {
      setDisplay(formatValue(raw));
    },
    [formatValue],
  );

  useEffect(() => {
    syncDisplay(safeValue);
    animated.value = withTiming(safeValue, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [safeValue, duration, animated, syncDisplay]);

  useAnimatedReaction(
    () => animated.value,
    (current) => {
      runOnJS(syncDisplay)(current);
    },
  );

  return <AnimatedText style={style}>{display}</AnimatedText>;
}
