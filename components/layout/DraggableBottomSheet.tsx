import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
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
} from 'react-native-gesture-handler';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmDiscardChanges } from '@/lib/forms/discard-changes';
import { lightImpact } from '@/lib/haptics/light-impact';
import { traceMovementStep } from '@/lib/doctor/movement-flow-trace';
import { colors, radius, spacing } from '@/lib/theme';

const DISMISS_DRAG = 110;
const DISMISS_VELOCITY = 850;
const SPRING_CONFIG = { damping: 22, stiffness: 280, mass: 0.85 };
const BLOCKED_SPRING = { damping: 18, stiffness: 420, mass: 0.7 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type DraggableBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Quando true, bloqueia swipe/backdrop e pede confirmação no X / voltar. */
  isDirty?: boolean;
  /** Retorna true para cancelar o fecho (ex.: voltar um passo interno). */
  onBeforeClose?: () => boolean;
  header?: React.ReactNode | ((requestClose: () => void) => React.ReactNode);
  children: React.ReactNode;
  maxHeight?: `${number}%` | number;
  sheetStyle?: StyleProp<ViewStyle>;
  scrollContentStyle?: StyleProp<ViewStyle>;
  /** Quando definido, regista open/close no Doctor (fluxo movement_create). */
  traceId?: string;
};

export function DraggableBottomSheet({
  visible,
  onClose,
  isDirty = false,
  onBeforeClose,
  header,
  children,
  maxHeight = '92%',
  sheetStyle,
  scrollContentStyle,
  traceId,
}: DraggableBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const sheetHeight = useSharedValue(0);
  const handlePulse = useSharedValue(0);
  const isDirtyShared = useSharedValue(isDirty);
  const isClosingRef = useRef(false);
  const [isMounted, setIsMounted] = useState(visible);

  useEffect(() => {
    isDirtyShared.value = isDirty;
  }, [isDirty, isDirtyShared]);

  const finishClose = useCallback(
    (notifyParent: boolean) => {
      isClosingRef.current = false;
      setIsMounted(false);
      translateY.value = 0;
      handlePulse.value = 0;
      if (notifyParent) onClose();
    },
    [handlePulse, onClose, translateY],
  );

  const animateOut = useCallback(
    (notifyParent: boolean) => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;

      const distance = sheetHeight.value > 0 ? sheetHeight.value : 420;
      translateY.value = withTiming(distance, { duration: 240 }, (finished) => {
        if (finished) {
          runOnJS(finishClose)(notifyParent);
        }
      });
    },
    [finishClose, sheetHeight, translateY],
  );

  const performClose = useCallback(() => {
    if (onBeforeClose?.()) return;
    animateOut(true);
  }, [animateOut, onBeforeClose]);

  const onBlockedDismiss = useCallback(() => {
    lightImpact();
    handlePulse.value = withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(0, { duration: 220 }),
    );
  }, [handlePulse]);

  const requestClose = useCallback(() => {
    if (onBeforeClose?.()) return;

    if (isDirty) {
      confirmDiscardChanges(performClose);
      return;
    }

    performClose();
  }, [isDirty, onBeforeClose, performClose]);

  useEffect(() => {
    if (visible) {
      if (traceId) {
        traceMovementStep('sheet_visible', { component: 'DraggableBottomSheet', traceId });
      }
      setIsMounted(true);
      isClosingRef.current = false;
      translateY.value = sheetHeight.value > 0 ? sheetHeight.value : 420;
      translateY.value = withSpring(0, SPRING_CONFIG);
      return;
    }

    if (isMounted && !isClosingRef.current) {
      if (traceId) {
        traceMovementStep('sheet_close', { component: 'DraggableBottomSheet', traceId });
      }
      animateOut(false);
    }
  }, [visible, isMounted, animateOut, sheetHeight, translateY, traceId]);

  useEffect(() => {
    if (!isMounted) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });

    return () => subscription.remove();
  }, [isMounted, requestClose]);

  const panGesture = Gesture.Pan()
    .activeOffsetY(6)
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      const shouldDismiss =
        translateY.value > DISMISS_DRAG || event.velocityY > DISMISS_VELOCITY;

      if (shouldDismiss) {
        if (isDirtyShared.value) {
          translateY.value = withSpring(0, BLOCKED_SPRING);
          runOnJS(onBlockedDismiss)();
          return;
        }

        runOnJS(performClose)();
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

  const handleAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: handlePulse.value > 0.5 ? colors.primary : colors.borderStrong,
    transform: [{ scaleX: 1 + handlePulse.value * 0.15 }],
  }));

  if (!isMounted) return null;

  return (
    <Modal
      visible={isMounted}
      animationType="none"
      transparent
      onRequestClose={requestClose}
      statusBarTranslucent
      hardwareAccelerated>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.overlay}>
          <AnimatedPressable
            style={[styles.backdrop, backdropAnimatedStyle]}
            onPress={() => {
              if (isDirty) {
                onBlockedDismiss();
                return;
              }
              requestClose();
            }}
            accessibilityLabel="Fechar"
          />

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
            <GestureDetector gesture={panGesture}>
              <View style={styles.handleArea}>
                <Animated.View style={[styles.handle, handleAnimatedStyle]} />
                {isDirty ? (
                  <View style={styles.protectedHint}>
                    <View style={styles.protectedDot} />
                  </View>
                ) : null}
              </View>
            </GestureDetector>

            {typeof header === 'function' ? header(requestClose) : header}

            <KeyboardAwareScrollView
              enableOnAndroid
              enableAutomaticScroll
              extraScrollHeight={Platform.OS === 'ios' ? 96 : 64}
              extraHeight={180}
              keyboardOpeningTime={0}
              enableResetScrollToCoords={false}
              bounces
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              nestedScrollEnabled
              contentContainerStyle={[styles.scrollContent, scrollContentStyle]}
              style={styles.keyboard}>
              {children}
            </KeyboardAwareScrollView>
          </Animated.View>
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
    gap: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
  },
  protectedHint: {
    height: 4,
  },
  protectedDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    opacity: 0.85,
  },
  keyboard: {
    flexShrink: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
    flexGrow: 1,
  },
});
