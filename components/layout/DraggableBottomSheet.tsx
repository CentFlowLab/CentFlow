import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
import { logAppError } from '@/lib/diagnostics';
import { traceMovementStep } from '@/lib/doctor/movement-flow-trace';
import { colors, radius, spacing } from '@/lib/theme';

import { BottomSheetScrollProvider } from './BottomSheetScrollContext';
import type { BottomSheetScrollController } from './BottomSheetScrollContext';

const DISMISS_DRAG = 110;
const DISMISS_VELOCITY = 850;
const OPEN_DURATION = 280;
const CLOSE_DURATION = 240;
const SPRING_CONFIG = { damping: 22, stiffness: 280, mass: 0.85 };
const FALLBACK_SHEET_HEIGHT = 420;
/** Margem mínima entre teclado e conteúdo/botão. */
const KEYBOARD_FOOTER_GAP = 16;
/** Reserva para botão Guardar no fundo do scroll (size lg ≈ 56px + margem). */
const SAVE_BUTTON_RESERVE = 72;
/** Espaço acima do input após scroll manual/automático. */
const FOCUS_SCROLL_TOP_INSET = 96;
const FOCUS_SCROLL_DELAY_IOS = 320;
const FOCUS_SCROLL_DELAY_ANDROID = 120;

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

function resolveKeyboardInset(keyboardHeight: number, safeAreaBottom: number): number {
  if (keyboardHeight <= 0) return 0;
  return Math.max(KEYBOARD_FOOTER_GAP, keyboardHeight - safeAreaBottom + KEYBOARD_FOOTER_GAP);
}

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
  const sheetHeight = useSharedValue(FALLBACK_SHEET_HEIGHT);
  const isClosingRef = useRef(false);
  const animateOutRef = useRef<(notifyParent: boolean) => void>(() => {});
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollContentRef = useRef<View | null>(null);
  const keyboardHeightRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isMounted, setIsMounted] = useState(visible);

  const keyboardInset = resolveKeyboardInset(keyboardHeight, insets.bottom);
  const scrollBottomPadding =
    spacing['2xl'] +
    keyboardInset +
    (keyboardHeight > 0 ? SAVE_BUTTON_RESERVE : 0);

  const scrollController = useMemo<BottomSheetScrollController>(
    () => ({
      keyboardInset,
      scrollToInput(input, meta) {
        if (!input) return;

        const runScroll = () => {
          const scrollView = scrollRef.current;
          const contentView = scrollContentRef.current;

          if (!scrollView || !contentView) return;

          try {
            input.measureLayout(
              contentView,
              (_x, y, _width, height) => {
                try {
                  const targetY = Math.max(
                    0,
                    y - FOCUS_SCROLL_TOP_INSET + height * 0.25,
                  );
                  scrollView.scrollTo({ y: targetY, animated: true });
                } catch (error) {
                  logAppError('bottom_sheet', error, {
                    screen: 'bottom_sheet',
                    action: 'input_focus_scroll',
                    component: 'DraggableBottomSheet',
                    field: meta?.field,
                    severity: 'low',
                  });
                }
              },
              () => {
                /* measureLayout falhou — scroll manual ainda possível via padding */
              },
            );
          } catch (error) {
            logAppError('bottom_sheet', error, {
              screen: 'bottom_sheet',
              action: 'input_focus_scroll',
              component: 'DraggableBottomSheet',
              field: meta?.field,
              severity: 'low',
            });
          }
        };

        const delay =
          Platform.OS === 'ios' ? FOCUS_SCROLL_DELAY_IOS : FOCUS_SCROLL_DELAY_ANDROID;
        setTimeout(runScroll, delay);
      },
    }),
    [keyboardInset],
  );

  const finishClose = useCallback(
    (notifyParent: boolean) => {
      isClosingRef.current = false;
      backdropOpacity.value = 0;
      translateY.value = sheetHeight.value > 0 ? sheetHeight.value : FALLBACK_SHEET_HEIGHT;
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
      setIsMounted(false);
      if (notifyParent) onClose();
      onDismissed?.();
    },
    [backdropOpacity, onClose, onDismissed, sheetHeight, translateY],
  );

  const animateOut = useCallback(
    (notifyParent: boolean) => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;

      const distance = sheetHeight.value > 0 ? sheetHeight.value : FALLBACK_SHEET_HEIGHT;
      backdropOpacity.value = withTiming(0, { duration: CLOSE_DURATION });
      translateY.value = withTiming(distance, { duration: CLOSE_DURATION }, (finished) => {
        if (finished) {
          runOnJS(finishClose)(notifyParent);
        }
      });
    },
    [backdropOpacity, finishClose, sheetHeight, translateY],
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
      try {
        const nextHeight = event.endCoordinates?.height ?? 0;
        keyboardHeightRef.current = nextHeight;
        setKeyboardHeight(nextHeight);
      } catch (error) {
        logAppError('bottom_sheet', error, {
          screen: 'bottom_sheet',
          action: 'keyboard_show',
          component: 'DraggableBottomSheet',
          severity: 'high',
        });
      }
    };

    const onKeyboardHide = () => {
      try {
        keyboardHeightRef.current = 0;
        setKeyboardHeight(0);
      } catch (error) {
        logAppError('bottom_sheet', error, {
          screen: 'bottom_sheet',
          action: 'keyboard_hide',
          component: 'DraggableBottomSheet',
          severity: 'high',
        });
      }
    };

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isMounted]);

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
    transform: [{ translateY: translateY.value }],
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
              {
                maxHeight,
                paddingBottom:
                  keyboardHeight > 0
                    ? KEYBOARD_FOOTER_GAP
                    : Math.max(insets.bottom, spacing.lg),
              },
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

            <BottomSheetScrollProvider value={scrollController}>
              <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={[
                  styles.scrollContent,
                  scrollContentStyle,
                  { paddingBottom: scrollBottomPadding },
                ]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                bounces>
                <View ref={scrollContentRef}>
                  {children}
                </View>
              </ScrollView>
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
    flexGrow: 1,
  },
});
