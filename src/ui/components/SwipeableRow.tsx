import { useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { layout, radius, useTheme } from '../theme';
import { Icon, type IconName } from './Icon';

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
  /** Raio do conteúdo, quando a linha é um cartão inteiro (ex.: veículos). */
  borderRadius?: number;
};

/** Botões arredondados e separados, ao estilo do Instagram (não um bloco colado ao bordo). */
const ACTION_SIZE = 52;
const ACTION_GAP = 10;
const ACTION_WIDTH = ACTION_SIZE + ACTION_GAP;
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

export function SwipeableRow({ children, actions, borderRadius = 0 }: Props) {
  const { colors } = useTheme();
  const width = ACTION_WIDTH * actions.length + ACTION_GAP;
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
                  backgroundColor: negative ? colors.negative : colors.surfaceMuted,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
              ]}>
              <Icon name={action.icon} size={24} color={negative ? 'textInverse' : 'text'} />
            </Pressable>
          );
        })}
      </View>
      <Animated.View
        {...responder.panHandlers}
        style={[
          styles.content,
          { backgroundColor: colors.surface, borderRadius, transform: [{ translateX }] },
        ]}>
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
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: ACTION_GAP,
    paddingRight: ACTION_GAP,
  },
  action: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    minHeight: layout.minTouchTarget,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    zIndex: 1,
  },
});
