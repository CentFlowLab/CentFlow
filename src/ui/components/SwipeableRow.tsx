import { useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { layout, spacing, useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type SwipeAction = {
  label: string;
  icon: IconName;
  tone?: 'neutral' | 'negative';
  onPress: () => void;
};

type Props = {
  children: ReactNode;
  /** Ações que aparecem à direita ao arrastar para a esquerda (a mais importante por último). */
  actions: readonly SwipeAction[];
};

const ACTION_WIDTH = 76;
/** Movimento mínimo, na horizontal, antes de o gesto ser do cartão e não do scroll. */
const START_THRESHOLD = 12;

/**
 * Linha que revela ações ao arrastar da direita para a esquerda, como no Mail do iPhone.
 * Só com `PanResponder`/`Animated` do React Native: funciona no iPhone, no Android e na web (rato),
 * sem módulos nativos. Leitores de ecrã: as mesmas ações ficam nas "ações" do elemento.
 */
/** Estado do gesto fora do React: valores mutáveis só nos callbacks do `PanResponder`. */
function createSwipe(width: number, onOpenChange: (open: boolean) => void) {
  const translateX = new Animated.Value(0);
  let offset = 0;
  const settle = (toOpen: boolean) => {
    offset = toOpen ? -width : 0;
    onOpenChange(toOpen);
    Animated.spring(translateX, {
      toValue: offset,
      useNativeDriver: false,
      bounciness: 0,
      speed: 20,
    }).start();
  };
  const responder = PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_event, gesture) =>
      Math.abs(gesture.dx) > START_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    // Uma vez a deslizar na horizontal, o scroll não tira o gesto a meio.
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_event, gesture) => {
      translateX.setValue(Math.min(0, Math.max(-width - 24, offset + gesture.dx)));
    },
    onPanResponderRelease: (_event, gesture) => {
      settle(offset + gesture.dx < -width / 2 || gesture.vx < -0.5);
    },
    onPanResponderTerminate: () => settle(offset !== 0),
  });
  return { translateX, responder, settle };
}

export function SwipeableRow({ children, actions }: Props) {
  const { colors } = useTheme();
  const width = ACTION_WIDTH * actions.length;
  const [open, setOpen] = useState(false);
  const [{ translateX, responder, settle }] = useState(() => createSwipe(width, setOpen));

  return (
    <View
      style={styles.root}
      accessibilityActions={actions.map((action, index) => ({
        name: `action-${index}`,
        label: action.label,
      }))}
      onAccessibilityAction={(event) => {
        const index = Number(event.nativeEvent.actionName.replace('action-', ''));
        actions[index]?.onPress();
      }}>
      <View style={[styles.actions, { width }]} importantForAccessibility="no-hide-descendants">
        {actions.map((action) => {
          const negative = action.tone === 'negative';
          return (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              accessibilityElementsHidden={!open}
              onPress={() => {
                settle(false);
                action.onPress();
              }}
              style={({ pressed }) => [
                styles.action,
                {
                  backgroundColor: negative ? colors.negativeMuted : colors.surfaceMuted,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <Icon name={action.icon} size={22} color={negative ? 'negative' : 'textSecondary'} />
              <Text
                variant="caption"
                style={{ color: negative ? colors.negative : colors.textSecondary }}>
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Animated.View
        {...responder.panHandlers}
        style={[styles.content, { backgroundColor: colors.surface, transform: [{ translateX }] }]}>
        {children}
        {open ? (
          // Aberta: tocar no conteúdo fecha em vez de abrir o movimento.
          <Pressable
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={StyleSheet.absoluteFill}
            onPress={() => settle(false)}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  actions: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  action: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  content: {
    zIndex: 1,
  },
});
