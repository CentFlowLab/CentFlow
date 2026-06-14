import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
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
  /** Retorna true para cancelar o fecho (ex.: voltar um passo interno). */
  onBeforeClose?: () => boolean;
  header?: React.ReactNode | ((requestClose: () => void) => React.ReactNode);
  children: React.ReactNode;
  maxHeight?: `${number}%` | number;
  sheetStyle?: StyleProp<ViewStyle>;
  scrollContentStyle?: StyleProp<ViewStyle>;
};

export function DraggableBottomSheet({
  visible,
  onClose,
  onBeforeClose,
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
  const [isMounted, setIsMounted] = useState(visible);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const finishClose = useCallback(
    (notifyParent: boolean) => {
      isClosingRef.current = false;
      setIsMounted(false);
      translateY.value = 0;
      scrollOffset.value = 0;
      if (notifyParent) onClose();
    },
    [onClose, scrollOffset, translateY],
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

  const tryClose = useCallback(
    (notifyParent: boolean) => {
      if (onBeforeClose?.()) return;
      animateOut(notifyParent);
    },
    [animateOut, onBeforeClose],
  );

  const requestClose = useCallback(() => {
    tryClose(true);
  }, [tryClose]);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      isClosingRef.current = false;
      translateY.value = sheetHeight.value > 0 ? sheetHeight.value : 420;
      translateY.value = withSpring(0, SPRING_CONFIG);
      return;
    }

    if (isMounted && !isClosingRef.current) {
      animateOut(false);
    }
  }, [visible, isMounted, animateOut, sheetHeight, translateY]);

  useEffect(() => {
    if (!isMounted) return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      tryClose(true);
      return true;
    });

    return () => subscription.remove();
  }, [isMounted, tryClose]);

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

  if (!isMounted) return null;

  const keyboardPadding =
    keyboardHeight > 0 ? Math.max(0, keyboardHeight - insets.bottom) : 0;

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
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'android' ? insets.top : 0}
                style={styles.keyboard}>
                <GestureDetector gesture={nativeScroll}>
                  <AnimatedScrollView
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    bounces
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    contentContainerStyle={[
                      styles.scrollContent,
                      scrollContentStyle,
                      keyboardPadding > 0 ? { paddingBottom: spacing.xl + keyboardPadding } : null,
                    ]}>
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
