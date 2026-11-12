import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View, type PanResponderInstance } from 'react-native';

import { layout, useTheme } from '../theme';
import { Icon } from './Icon';
import { reorderTarget } from './reorder';

type Props<T> = {
  data: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /** Chamado ao largar numa posição diferente. */
  onReorder: (from: number, to: number) => void;
  /** Rótulo da pega de arrastar (leitores de ecrã), ex.: "Arrastar Casa". */
  handleLabel: (item: T) => string;
  separator?: ReactNode;
};

/** Valores mutáveis do gesto, guardados num fecho (não em refs nem em estado do React). */
function createGestureState<T>(data: readonly T[], onReorder: (from: number, to: number) => void) {
  let latest = { data, onReorder };
  return {
    heights: [] as number[],
    responders: new Map<string, PanResponderInstance>(),
    drag: new Animated.Value(0),
    update(nextData: readonly T[], nextOnReorder: (from: number, to: number) => void) {
      latest = { data: nextData, onReorder: nextOnReorder };
    },
    current: () => latest,
  };
}

/**
 * Lista ordenável por arrastar e largar: a pega à esquerda de cada linha arrasta-a com o dedo
 * (iPhone, Android) ou com o rato (web, Windows). Só `PanResponder` e `Animated`, sem módulos
 * nativos. A pega não deixa o scroll roubar o gesto, e o resto da linha continua a fazer scroll.
 * Para teclado e leitores de ecrã, o ecrã deve oferecer também ações Subir/Descer.
 */
export function ReorderableList<T>({
  data,
  keyOf,
  renderItem,
  onReorder,
  handleLabel,
  separator,
}: Props<T>) {
  const { colors } = useTheme();
  // Estado do gesto fora do React (como no SwipeableRow): os callbacks do PanResponder são
  // criados uma vez por linha e leem sempre os valores atuais.
  const [gesture] = useState(() => createGestureState(data, onReorder));
  useEffect(() => gesture.update(data, onReorder));
  const [dragging, setDragging] = useState<{
    from: number;
    to: number;
    heights: number[];
  } | null>(null);
  const { drag } = gesture;

  const responderFor = (key: string) => {
    let responder = gesture.responders.get(key);
    if (responder) return responder;
    const indexOf = () => gesture.current().data.findIndex((item) => keyOf(item) === key);
    responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Enquanto se arrasta, o scroll da página não pode ficar com o gesto.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        const from = indexOf();
        drag.setValue(0);
        setDragging({ from, to: from, heights: [...gesture.heights] });
      },
      onPanResponderMove: (_, move) => {
        drag.setValue(move.dy);
        const from = indexOf();
        const to = reorderTarget(gesture.heights, from, move.dy);
        setDragging((current) => (current && current.to !== to ? { ...current, to } : current));
      },
      onPanResponderRelease: (_, move) => {
        const from = indexOf();
        const to = reorderTarget(gesture.heights, from, move.dy);
        drag.setValue(0);
        setDragging(null);
        if (to !== from) gesture.current().onReorder(from, to);
      },
      onPanResponderTerminate: () => {
        drag.setValue(0);
        setDragging(null);
      },
    });
    gesture.responders.set(key, responder);
    return responder;
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
        return (
          <Fragment key={key}>
            {index > 0 && separator && !dragging ? separator : null}
            <Animated.View
              onLayout={(event) => {
                gesture.heights[index] = event.nativeEvent.layout.height;
              }}
              style={[
                styles.row,
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
                {...responderFor(key).panHandlers}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel={handleLabel(item)}
                // Leitores de ecrã: deslizar para cima/baixo na pega sobe/desce a linha.
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(event) => {
                  const to = event.nativeEvent.actionName === 'increment' ? index + 1 : index - 1;
                  if (to >= 0 && to < data.length) onReorder(index, to);
                }}
                style={styles.handle}>
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
  handle: {
    width: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    // Web: o browser não deve fazer scroll nem selecionar texto ao arrastar pela pega.
    touchAction: 'none',
    userSelect: 'none',
    cursor: 'grab',
  } as never,
  content: { flex: 1, minWidth: 0 },
});
