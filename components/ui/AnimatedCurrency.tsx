import { useEffect, useState } from 'react';
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

export function AnimatedCurrency({
  value,
  formatter,
  style,
  duration = 600,
}: AnimatedCurrencyProps) {
  const animated = useSharedValue(value);
  const [display, setDisplay] = useState(formatter(value));

  useEffect(() => {
    animated.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration, animated]);

  useAnimatedReaction(
    () => animated.value,
    (current) => {
      runOnJS(setDisplay)(formatter(Math.round(current * 100) / 100));
    },
  );

  return <AnimatedText style={style}>{display}</AnimatedText>;
}
