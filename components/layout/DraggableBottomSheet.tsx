import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmDiscardChanges } from '@/lib/forms/discard-changes';
import { traceMovementStep } from '@/lib/doctor/movement-flow-trace';
import { colors, radius, spacing } from '@/lib/theme';

const DISMISS_DRAG = 110;
const DISMISS_VELOCITY = 850;
const SPRING_CONFIG = { damping: 22, stiffness: 280, mass: 0.85 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type DraggableBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Chamado quando o Modal desmonta após a animação de fecho (antes de abrir outro sheet). */
  onDismissed?: () => void;
  /**
   * Quando true, pede confirmação ao fechar pelo X ou botão voltar.
   * Swipe no handle/header e toque no backdrop fecham sem confirmação.
   */
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
  onDismissed,
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
  const isClosingRef = useRef(false);
  const animateOutRef = useRef<(notifyParent: boolean) => void>(() => {});
  const [isMounted, setIsMounted] = useState(visible);

  const finishClose = useCallback(
    (notifyParent: boolean) => {
      isClosingRef.current = false;
      setIsMounted(false);
      translateY.value = 0;
      if (notifyParent) onClose();
      onDismissed?.();
    },
    [onClose, onDismissed, translateY],
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

  animateOutRef.current = animateOut;

  /** Fecho imediato — swipe (handle/header), backdrop. */
  const dismissSheet = useCallback(() => {
    if (onBeforeClose?.()) return;
    animateOut(true);
  }, [animateOut, onBeforeClose]);

  /** Fecho pelo X / voltar — confirma se isDirty. */
  const requestClose = useCallback(() => {
    if (onBeforeClose?.()) return;

    if (isDirty) {
      confirmDiscardChanges(dismissSheet);
      return;
    }

    dismissSheet();
  }, [dismissSheet, isDirty, onBeforeClose]);

  useEffect(() => {
    if (visible) {
      if (!isMounted) {
        if (traceId) {
          traceMovementStep('sheet_visible', { component: 'DraggableBottomSheet', traceId });
        }
        setIsMounted(true);
        isClosingRef.current = false;
        translateY.value = sheetHeight.value > 0 ? sheetHeight.value : 420;
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
      return;
    }

    if (isMounted && !isClosingRef.current) {
      if (traceId) {
        traceMovementStep('sheet_close', { component: 'DraggableBottomSheet', traceId });
      }
      animateOutRef.current(false);
    }
  }, [visible, isMounted, sheetHeight, translateY, traceId]);

  useEffect(() => {
    if (!isMounted) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });

    return () => subscription.remove();
  }, [isMounted, requestClose]);

  const panGesture = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-28, 28])
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      const shouldDismiss =
        translateY.value > DISMISS_DRAG || event.velocityY > DISMISS_VELOCITY;

      if (shouldDismiss) {
        runOnJS(dismissSheet)();
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

  const headerContent =
    typeof header === 'function' ? header(requestClose) : header;

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
            onPress={dismissSheet}
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
              <View style={styles.dragZone}>
                <View style={styles.handleArea}>
                  <View style={styles.handle} />
                </View>
                {headerContent}
              </View>
            </GestureDetector>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
              style={styles.keyboard}>
              <ScrollView
                bounces
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                nestedScrollEnabled
                contentContainerStyle={[styles.scrollContent, scrollContentStyle]}>
                {children}
              </ScrollView>
            </KeyboardAvoidingView>
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
  dragZone: {
    flexShrink: 0,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
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
