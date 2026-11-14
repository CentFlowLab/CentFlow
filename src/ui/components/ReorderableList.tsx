import { Fragment, useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  View,
  type PanResponderGestureState,
  type PanResponderInstance,
} from 'react-native';

import { useScreenScroll, type ScreenScroll } from '../layout/screenScroll';
import { layout, useTheme } from '../theme';
import { Icon } from './Icon';
import { autoScrollStep, reorderTarget } from './reorder';

/** Toque longo para começar a arrastar a partir da linha (a pega começa logo). */
const LONG_PRESS_MS = 250;
/** Movimento tolerado antes de o toque longo ativar; acima disto é scroll, não arrasto. */
const LONG_PRESS_SLOP = 8;

type Props<T> = {
  data: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /** Chamado ao largar numa posição diferente. */
  onReorder: (from: number, to: number) => void;
  /** Rótulo da linha para leitores de ecrã, ex.: "Arrastar Casa". */
  handleLabel: (item: T) => string;
  /** Rótulos das ações Subir/Descer para leitores de ecrã. */
  moveLabels?: (item: T) => { up: string; down: string };
  separator?: ReactNode;
  /** Arrasto ativado (toque longo ou pega). */
  onDragStart?: (index: number) => void;
  /** O destino mudou durante o arrasto. */
  onTargetChange?: (from: number, to: number) => void;
  /** Fim do arrasto (largar), com o destino. */
  onDragEnd?: (from: number, to: number) => void;
};

type Dragging = { from: number; to: number; heights: number[] };

type Callbacks = {
  data: readonly unknown[];
  onReorder: (from: number, to: number) => void;
  onDragStart?: (index: number) => void;
  onTargetChange?: (from: number, to: number) => void;
  onDragEnd?: (from: number, to: number) => void;
  scroll: ScreenScroll;
  setDragging: (update: (current: Dragging | null) => Dragging | null) => void;
};

/**
 * Valores mutáveis do gesto, guardados num fecho (não em refs nem em estado do React): os
 * callbacks do PanResponder são criados uma vez por linha e leem sempre os valores atuais.
 */
function createGestureState(initial: Callbacks) {
  let latest = initial;
  let active: { from: number; startOffset: number; dy: number; pointerY: number } | null = null;
  let frame: ReturnType<typeof requestAnimationFrame> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastTarget = -1;
  const heights: number[] = [];
  const drag = new Animated.Value(0);

  /** Deslocação real da linha: o dedo mais o que a página andou desde o início. */
  const effectiveDy = () =>
    active ? active.dy + (latest.scroll.getScrollOffset() - active.startOffset) : 0;

  const updateTarget = () => {
    if (!active) return;
    const dy = effectiveDy();
    drag.setValue(dy);
    const to = reorderTarget(heights, active.from, dy);
    if (to !== lastTarget) {
      lastTarget = to;
      latest.onTargetChange?.(active.from, to);
    }
    latest.setDragging((current) => (current && current.to !== to ? { ...current, to } : current));
  };

  const stopFrame = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  };

  /** Scroll automático enquanto o dedo/rato está perto do topo ou do fundo. */
  const tick = () => {
    frame = null;
    if (!active) return;
    const viewport = latest.scroll.getViewport();
    const step = viewport ? autoScrollStep(active.pointerY, viewport.top, viewport.height) : 0;
    if (step === 0) return;
    latest.scroll.scrollBy(step);
    updateTarget();
    frame = requestAnimationFrame(tick);
  };

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const state = {
    heights,
    drag,
    responders: new Map<string, { row: PanResponderInstance; handle: PanResponderInstance }>(),
    update(next: Callbacks) {
      latest = next;
    },
    isActive: () => active !== null,
    /** Os dados atuais (a ordem muda depois de cada arrasto). */
    data: () => latest.data,
    activate(from: number, pointerY: number) {
      clearTimer();
      if (from < 0) return;
      active = { from, startOffset: latest.scroll.getScrollOffset(), dy: 0, pointerY };
      lastTarget = from;
      drag.setValue(0);
      latest.scroll.setScrollLocked(true);
      latest.setDragging(() => ({ from, to: from, heights: [...heights] }));
      latest.onDragStart?.(from);
    },
    move(gesture: PanResponderGestureState) {
      if (!active) return;
      active.dy = gesture.dy;
      active.pointerY = gesture.moveY;
      updateTarget();
      if (frame === null) frame = requestAnimationFrame(tick);
    },
    release() {
      clearTimer();
      stopFrame();
      const finished = active;
      const to = finished ? reorderTarget(heights, finished.from, effectiveDy()) : -1;
      state.reset();
      if (finished) {
        latest.onDragEnd?.(finished.from, to);
        if (to !== finished.from) latest.onReorder(finished.from, to);
      }
    },
    /** Termina sem gravar (cancelado, ecrã fechado): o scroll volta sempre. */
    reset() {
      clearTimer();
      stopFrame();
      const wasActive = active !== null;
      active = null;
      drag.setValue(0);
      if (wasActive) {
        latest.scroll.setScrollLocked(false);
        latest.setDragging(() => null);
      }
    },
    startTimer(fire: () => void) {
      clearTimer();
      timer = setTimeout(fire, LONG_PRESS_MS);
    },
    cancelTimer: clearTimer,
  };
  return state;
}

/**
 * Lista ordenável por arrastar e largar (ADR-059). Toque longo em qualquer ponto da linha, ou a
 * pega à esquerda (imediato, também com o rato), e arrasta-se. Antes de o toque longo ativar, um
 * gesto vertical continua a fazer scroll à página; durante o arrasto a página fica parada e só se
 * desloca sozinha perto das margens. Só `PanResponder` e `Animated`, sem módulos nativos.
 * Leitores de ecrã: a linha é ajustável (subir/descer) e tem as ações com nome.
 */
export function ReorderableList<T>({
  data,
  keyOf,
  renderItem,
  onReorder,
  handleLabel,
  moveLabels,
  separator,
  onDragStart,
  onTargetChange,
  onDragEnd,
}: Props<T>) {
  const { colors } = useTheme();
  const scroll = useScreenScroll();
  const [dragging, setDragging] = useState<Dragging | null>(null);
  const [gesture] = useState(() =>
    createGestureState({
      data,
      onReorder,
      onDragStart,
      onTargetChange,
      onDragEnd,
      scroll,
      setDragging,
    }),
  );
  useEffect(
    () =>
      gesture.update({
        data,
        onReorder,
        onDragStart,
        onTargetChange,
        onDragEnd,
        scroll,
        setDragging,
      }),
    [gesture, data, onReorder, onDragStart, onTargetChange, onDragEnd, scroll],
  );
  // Sair do modo de ordenar a meio de um arrasto não deixa o scroll bloqueado.
  useEffect(() => () => gesture.reset(), [gesture]);
  const { drag } = gesture;

  const respondersFor = (key: string) => {
    const existing = gesture.responders.get(key);
    if (existing) return existing;
    const currentIndex = () =>
      (gesture.data() as readonly T[]).findIndex((item) => keyOf(item) === key);

    // Linha: toque longo. Até ativar, o scroll pode ficar com o gesto.
    const row = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => gesture.isActive(),
      onPanResponderTerminationRequest: () => !gesture.isActive(),
      onShouldBlockNativeResponder: () => false,
      onPanResponderGrant: (event) => {
        const pointerY = event.nativeEvent.pageY;
        gesture.startTimer(() => gesture.activate(currentIndex(), pointerY));
      },
      onPanResponderMove: (_, move) => {
        if (gesture.isActive()) {
          gesture.move(move);
          return;
        }
        if (Math.abs(move.dx) > LONG_PRESS_SLOP || Math.abs(move.dy) > LONG_PRESS_SLOP) {
          gesture.cancelTimer();
        }
      },
      onPanResponderRelease: () => gesture.release(),
      onPanResponderTerminate: () => gesture.reset(),
    });

    // Pega: arrasta logo (dedo ou rato), sem deixar o scroll ficar com o gesto.
    const handle = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (event) => gesture.activate(currentIndex(), event.nativeEvent.pageY),
      onPanResponderMove: (_, move) => gesture.move(move),
      onPanResponderRelease: () => gesture.release(),
      onPanResponderTerminate: () => gesture.reset(),
    });

    const responders = { row, handle };
    gesture.responders.set(key, responders);
    return responders;
  };

  const shift = (index: number) => {
    if (!dragging || index === dragging.from) return 0;
    const moved = dragging.heights[dragging.from] ?? 0;
    if (dragging.from < index && index <= dragging.to) return -moved;
    if (dragging.to <= index && index < dragging.from) return moved;
    return 0;
  };

  return (
    <View>
      {data.map((item, index) => {
        const key = keyOf(item);
        const active = dragging?.from === index;
        const responders = respondersFor(key);
        const labels = moveLabels?.(item);
        const actions = [
          ...(index < data.length - 1 ? [{ name: 'increment' }] : []),
          ...(index > 0 ? [{ name: 'decrement' }] : []),
          ...(labels && index > 0 ? [{ name: 'moveUp', label: labels.up }] : []),
          ...(labels && index < data.length - 1 ? [{ name: 'moveDown', label: labels.down }] : []),
        ];
        return (
          <Fragment key={key}>
            {index > 0 && separator && !dragging ? separator : null}
            <Animated.View
              {...responders.row.panHandlers}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={handleLabel(item)}
              accessibilityActions={actions}
              onAccessibilityAction={(event) => {
                const name = event.nativeEvent.actionName;
                const to =
                  name === 'increment' || name === 'moveDown'
                    ? index + 1
                    : name === 'decrement' || name === 'moveUp'
                      ? index - 1
                      : index;
                if (to !== index && to >= 0 && to < data.length) onReorder(index, to);
              }}
              onLayout={(event) => {
                gesture.heights[index] = event.nativeEvent.layout.height;
              }}
              style={[
                styles.row,
                Platform.OS === 'web' ? (styles.rowWeb as never) : null,
                active
                  ? {
                      transform: [{ translateY: drag }],
                      zIndex: 2,
                      backgroundColor: colors.surfaceHover,
                      boxShadow: `0 6px 18px ${colors.shadow}`,
                    }
                  : { transform: [{ translateY: shift(index) }] },
              ]}>
              <View
                {...responders.handle.panHandlers}
                accessible={false}
                importantForAccessibility="no"
                style={[styles.handle, { cursor: active ? 'grabbing' : 'grab' } as never]}>
                <Icon
                  name="reorder-three-outline"
                  size={22}
                  color={active ? 'primary' : 'textTertiary'}
                />
              </View>
              <View style={styles.content}>{renderItem(item, index)}</View>
            </Animated.View>
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  // Web: antes de ativar, o browser continua a fazer scroll vertical; sem seleção de texto.
  rowWeb: { touchAction: 'pan-y', userSelect: 'none' } as never,
  handle: {
    width: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    // Web: na pega, o browser não faz scroll nem seleciona texto.
    touchAction: 'none',
    userSelect: 'none',
  } as never,
  content: { flex: 1, minWidth: 0 },
});
