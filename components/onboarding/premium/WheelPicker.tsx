import { useCallback, useEffect, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { ScrollView } from 'react-native';

import { Text } from '@/components/ui';
import { haptics } from '@/lib/ui/haptics';
import { colors, radius, spacing } from '@/lib/theme';

export type WheelItem = { value: number; label: string };

const ITEM_HEIGHT = 48;
const VISIBLE = 5;
const CENTER = Math.floor(VISIBLE / 2);

type WheelPickerProps = {
  data: WheelItem[];
  value: number;
  onChange: (value: number) => void;
  width?: number;
  suffix?: string;
};

/**
 * Wheel picker estilo iOS, 100% JS (OTA-safe): Reanimated + ScrollView com snap.
 * Os itens escalam e desvanecem conforme a distância ao centro.
 */
export function WheelPicker({ data, value, onChange, width, suffix }: WheelPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useSharedValue(0);
  const lastIndex = useRef(-1);

  const selectedIndex = Math.max(
    0,
    data.findIndex((item) => item.value === value),
  );

  useEffect(() => {
    const offset = selectedIndex * ITEM_HEIGHT;
    // Posiciona sem animação no arranque / quando o valor muda externamente.
    scrollRef.current?.scrollTo({ y: offset, animated: false });
    scrollY.value = offset;
    lastIndex.current = selectedIndex;
  }, [selectedIndex, scrollY]);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = event.nativeEvent.contentOffset.y;
      const index = Math.min(data.length - 1, Math.max(0, Math.round(offset / ITEM_HEIGHT)));
      if (index !== lastIndex.current) {
        lastIndex.current = index;
        haptics.selection();
        onChange(data[index].value);
      }
    },
    [data, onChange],
  );

  return (
    <View style={[styles.wrap, width ? { width } : null]}>
      <View style={styles.selectionBand} pointerEvents="none" />
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * CENTER }}>
        {data.map((item, index) => (
          <WheelRow key={item.value} index={index} label={item.label} scrollY={scrollY} />
        ))}
      </Animated.ScrollView>
      {suffix ? (
        <Text variant="h3" color="textSecondary" style={styles.suffix}>
          {suffix}
        </Text>
      ) : null}
      <View style={styles.fadeTop} pointerEvents="none" />
      <View style={styles.fadeBottom} pointerEvents="none" />
    </View>
  );
}

function WheelRow({
  index,
  label,
  scrollY,
}: {
  index: number;
  label: string;
  scrollY: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const position = index * ITEM_HEIGHT;
    const distance = scrollY.value - position;
    const ratio = distance / ITEM_HEIGHT;
    const opacity = interpolate(
      Math.abs(ratio),
      [0, 1, 2],
      [1, 0.45, 0.18],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(Math.abs(ratio), [0, 1, 2], [1, 0.82, 0.66], Extrapolation.CLAMP);
    const rotateX = interpolate(ratio, [-2, 0, 2], [55, 0, -55], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ perspective: 600 }, { rotateX: `${rotateX}deg` }, { scale }],
    };
  });

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      <Text variant="h1" style={styles.rowText}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: ITEM_HEIGHT * VISIBLE,
    justifyContent: 'center',
  },
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * CENTER,
    height: ITEM_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  row: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    fontWeight: '700',
  },
  suffix: {
    position: 'absolute',
    right: spacing.xl,
    top: ITEM_HEIGHT * CENTER + ITEM_HEIGHT / 2 - 12,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * CENTER,
    backgroundColor: 'transparent',
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * CENTER,
    backgroundColor: 'transparent',
  },
});
