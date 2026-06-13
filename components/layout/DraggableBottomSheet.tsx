import { useCallback, useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  ScrollView,
} from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/lib/theme';

const DISMISS_DRAG = 110;
const DISMISS_VELOCITY = 850;
const SPRING_CONFIG = { damping: 22, stiffness: 280, mass: 0.85 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

type DraggableBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  header?: React.ReactNode | ((requestClose: () => void) => React.ReactNode);
  children: React.ReactNode;
  maxHeight?: `${number}%` | number;
  sheetStyle?: StyleProp<ViewStyle>;
  scrollContentStyle?: StyleProp<ViewStyle>;
};

export function DraggableBottomSheet({
  visible,
  onClose,
  header,
  children,
  maxHeight = '92%',
  sheetStyle,
  scrollContentStyle,
}: DraggableBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const sheetHeight = useSharedValue(0);
  const scrollOffset = useSharedValue(0);
  const isClosingRef = useRef(false);

  const requestClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    const distance = sheetHeight.value > 0 ? sheetHeight.value : 420;
    translateY.value = withTiming(distance, { duration: 240 }, (finished) => {
      if (finished) {
        isClosingRef.current = false;
        runOnJS(onClose)();
      }
    });
  }, [onClose, sheetHeight, translateY]);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      translateY.value = sheetHeight.value > 0 ? sheetHeight.value : 420;
      translateY.value = withSpring(0, SPRING_CONFIG);
    } else {
      translateY.value = 0;
      scrollOffset.value = 0;
    }
  }, [visible, scrollOffset, sheetHeight, translateY]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  const nativeScroll = Gesture.Native();

  const panGesture = Gesture.Pan()
    .simultaneousWithExternalGesture(nativeScroll)
    .activeOffsetY(6)
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      if (scrollOffset.value > 2) return;
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      const shouldDismiss =
        translateY.value > DISMISS_DRAG || event.velocityY > DISMISS_VELOCITY;

      if (shouldDismiss) {
        runOnJS(requestClose)();
        return;
      }

      translateY.value = withSpring(0, SPRING_CONFIG);
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    const max = sheetHeight.value > 0 ? sheetHeight.value : 420;
    return {
      opacity: interpolate(translateY.value, [0, max], [1, 0], Extrapolation.CLAMP),
    };
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={requestClose}
      statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.overlay}>
          <AnimatedPressable
            style={[styles.backdrop, backdropAnimatedStyle]}
            onPress={requestClose}
            accessibilityLabel="Fechar"
          />

          <GestureDetector gesture={panGesture}>
            <Animated.View
              onLayout={(event) => {
                sheetHeight.value = event.nativeEvent.layout.height;
              }}
              style={[
                styles.sheet,
                { maxHeight, paddingBottom: Math.max(insets.bottom, spacing.lg) },
                sheetAnimatedStyle,
                sheetStyle,
              ]}>
              <View style={styles.handleArea}>
                <View style={styles.handle} />
              </View>

              {typeof header === 'function' ? header(requestClose) : header}

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboard}>
                <GestureDetector gesture={nativeScroll}>
                  <AnimatedScrollView
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    bounces
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={[styles.scrollContent, scrollContentStyle]}>
                    {children}
                  </AnimatedScrollView>
                </GestureDetector>
              </KeyboardAvoidingView>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
  },
  keyboard: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
});
