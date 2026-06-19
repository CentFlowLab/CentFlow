import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type KeyboardEvent,
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
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmDiscardChanges } from '@/lib/forms/discard-changes';
import { traceMovementStep } from '@/lib/doctor/movement-flow-trace';
import { colors, radius, spacing } from '@/lib/theme';

import { BottomSheetScrollProvider } from './BottomSheetScrollContext';
import type { BottomSheetScrollRef } from './BottomSheetScrollContext';

const DISMISS_DRAG = 110;
const DISMISS_VELOCITY = 850;
const OPEN_DURATION = 280;
const CLOSE_DURATION = 240;
const SPRING_CONFIG = { damping: 22, stiffness: 280, mass: 0.85 };
const FALLBACK_SHEET_HEIGHT = 420;

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
  const translateY = useSharedValue(FALLBACK_SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const keyboardOffset = useSharedValue(0);
  const sheetHeight = useSharedValue(FALLBACK_SHEET_HEIGHT);
  const isClosingRef = useRef(false);
  const animateOutRef = useRef<(notifyParent: boolean) => void>(() => {});
  const scrollRef = useRef<BottomSheetScrollRef>(null);
  const [scrollView, setScrollView] = useState<BottomSheetScrollRef>(null);
  const [isMounted, setIsMounted] = useState(visible);

  const finishClose = useCallback(
    (notifyParent: boolean) => {
      isClosingRef.current = false;
      keyboardOffset.value = 0;
      backdropOpacity.value = 0;
      translateY.value = sheetHeight.value > 0 ? sheetHeight.value : FALLBACK_SHEET_HEIGHT;
      setIsMounted(false);
      if (notifyParent) onClose();
      onDismissed?.();
    },
    [backdropOpacity, keyboardOffset, onClose, onDismissed, sheetHeight, translateY],
  );

  const animateOut = useCallback(
    (notifyParent: boolean) => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;
      keyboardOffset.value = withTiming(0, { duration: 160 });

      const distance = sheetHeight.value > 0 ? sheetHeight.value : FALLBACK_SHEET_HEIGHT;
      backdropOpacity.value = withTiming(0, { duration: CLOSE_DURATION });
      translateY.value = withTiming(distance, { duration: CLOSE_DURATION }, (finished) => {
        if (finished) {
          runOnJS(finishClose)(notifyParent);
        }
      });
    },
    [backdropOpacity, finishClose, keyboardOffset, sheetHeight, translateY],
  );

  animateOutRef.current = animateOut;

  const dismissSheet = useCallback(() => {
    if (onBeforeClose?.()) return;
    Keyboard.dismiss();
    animateOut(true);
  }, [animateOut, onBeforeClose]);

  const requestClose = useCallback(() => {
    if (onBeforeClose?.()) return;

    if (isDirty) {
      confirmDiscardChanges(dismissSheet);
      return;
    }

    dismissSheet();
  }, [dismissSheet, isDirty, onBeforeClose]);

  const animateIn = useCallback(() => {
    const distance = sheetHeight.value > 0 ? sheetHeight.value : FALLBACK_SHEET_HEIGHT;
    translateY.value = distance;
    backdropOpacity.value = 0;
    translateY.value = withTiming(0, { duration: OPEN_DURATION });
    backdropOpacity.value = withTiming(1, { duration: OPEN_DURATION });
  }, [backdropOpacity, sheetHeight, translateY]);

  useLayoutEffect(() => {
    if (visible) {
      if (!isMounted) {
        if (traceId) {
          traceMovementStep('sheet_visible', { component: 'DraggableBottomSheet', traceId });
        }
        const distance = sheetHeight.value > 0 ? sheetHeight.value : FALLBACK_SHEET_HEIGHT;
        translateY.value = distance;
        backdropOpacity.value = 0;
        isClosingRef.current = false;
        setIsMounted(true);
      } else if (!isClosingRef.current) {
        animateIn();
      }
      return;
    }

    if (isMounted && !isClosingRef.current) {
      if (traceId) {
        traceMovementStep('sheet_close', { component: 'DraggableBottomSheet', traceId });
      }
      animateOutRef.current(false);
    }
  }, [visible, isMounted, animateIn, sheetHeight, translateY, backdropOpacity, traceId]);

  useEffect(() => {
    if (!isMounted) return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (event: KeyboardEvent) => {
      const lift = Math.max(0, event.endCoordinates.height - insets.bottom);
      const duration =
        Platform.OS === 'ios' && event.duration > 0 ? event.duration : 250;
      keyboardOffset.value = withTiming(lift, { duration });
    };

    const onKeyboardHide = (event: KeyboardEvent) => {
      const duration =
        Platform.OS === 'ios' && event.duration > 0 ? event.duration : 200;
      keyboardOffset.value = withTiming(0, { duration });
    };

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom, isMounted, keyboardOffset]);

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
      const max = sheetHeight.value > 0 ? sheetHeight.value : FALLBACK_SHEET_HEIGHT;
      backdropOpacity.value = interpolate(
        translateY.value,
        [0, max],
        [1, 0],
        Extrapolation.CLAMP,
      );
    })
    .onEnd((event) => {
      const shouldDismiss =
        translateY.value > DISMISS_DRAG || event.velocityY > DISMISS_VELOCITY;

      if (shouldDismiss) {
        runOnJS(dismissSheet)();
        return;
      }

      translateY.value = withSpring(0, SPRING_CONFIG);
      backdropOpacity.value = withTiming(1, { duration: 180 });
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value - keyboardOffset.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

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
              const height = event.nativeEvent.layout.height;
              if (height > 0) {
                sheetHeight.value = height;
              }
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

            <BottomSheetScrollProvider value={scrollView}>
              <KeyboardAwareScrollView
                innerRef={(ref) => {
                  scrollRef.current = ref;
                  if (scrollView !== ref) {
                    setScrollView(ref);
                  }
                }}
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, scrollContentStyle]}
                enableOnAndroid
                enableAutomaticScroll
                enableResetScrollToCoords={false}
                extraScrollHeight={Platform.OS === 'ios' ? 72 : 96}
                extraHeight={Platform.OS === 'ios' ? 120 : 140}
                keyboardOpeningTime={Platform.OS === 'ios' ? 250 : 0}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                bounces>
                {children}
              </KeyboardAwareScrollView>
            </BottomSheetScrollProvider>
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
    ...StyleSheet.absoluteFillObject,
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
    overflow: 'hidden',
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
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
    flexGrow: 1,
  },
});
