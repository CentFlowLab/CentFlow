import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFloatingTabBarInset } from '../layout/floatingTabBar';
import { NO_SCREEN_SCROLL, ScreenScrollContext, type ScreenScroll } from '../layout/screenScroll';
import { useBreakpoint } from '../layout/useBreakpoint';
import { layout, spacing, useTheme } from '../theme';
import { FadeIn } from './FadeIn';
import { Text } from './Text';

type Props = {
  title?: string;
  subtitle?: string;
  /** Ações no cabeçalho (ex.: botão de adicionar). */
  headerRight?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
};

/**
 * Estado do scroll fora do React (posição, medidas, o ScrollView), lido pelos gestos sem
 * provocar renders. Só o bloqueio do scroll passa pelo estado do React.
 */
function createScrollState(setLocked: (locked: boolean) => void) {
  let view: ScrollViewInstance | null = null;
  let offset = 0;
  let contentHeight = 0;
  let viewport: { top: number; height: number } | null = null;
  const api: ScreenScroll = {
    setScrollLocked: setLocked,
    getScrollOffset: () => offset,
    scrollBy: (dy) => {
      const max = Math.max(0, contentHeight - (viewport?.height ?? 0));
      const next = Math.min(max, Math.max(0, offset + dy));
      if (next === offset) return;
      offset = next;
      view?.scrollTo({ y: next, animated: false });
    },
    getViewport: () => viewport,
  };
  return {
    api,
    attach: (node: ScrollViewInstance | null) => {
      view = node;
    },
    onScroll: (y: number) => {
      offset = y;
    },
    onContentSize: (height: number) => {
      contentHeight = height;
    },
    measure: () => {
      (
        view as unknown as { measureInWindow?: (cb: (...v: number[]) => void) => void } | null
      )?.measureInWindow?.((_x, y, _w, height) => {
        if (Number.isFinite(y) && Number.isFinite(height)) viewport = { top: y, height };
      });
    },
  };
}

/** Estrutura base de cada ecrã: safe area, largura máxima em desktop e cabeçalho consistente. */
export function Screen({ title, subtitle, headerRight, children, scroll = true }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const breakpoint = useBreakpoint();
  const horizontal = breakpoint === 'compact' ? spacing.lg : spacing['3xl'];
  const top = insets.top + (breakpoint === 'compact' ? spacing.lg : spacing['3xl']);
  // Telemóvel, nos separadores: o fim do conteúdo fica acima da barra flutuante.
  const bottom = spacing['4xl'] + useFloatingTabBarInset();
  const [locked, setLocked] = useState(false);
  const [{ api, attach, onScroll, onContentSize, measure }] = useState(() =>
    createScrollState(setLocked),
  );

  const body = (
    <View
      style={[
        styles.content,
        { paddingHorizontal: horizontal, paddingTop: top, paddingBottom: bottom },
      ]}>
      {title ? (
        <View style={styles.header}>
          <View style={styles.headerTexts}>
            <Text variant={breakpoint === 'compact' ? 'title1' : 'display'}>{title}</Text>
            {subtitle ? (
              <Text variant="callout" tone="secondary">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {headerRight}
        </View>
      ) : null}
      <FadeIn style={styles.body}>{children}</FadeIn>
    </View>
  );

  if (!scroll) {
    return (
      <ScreenScrollContext.Provider value={NO_SCREEN_SCROLL}>
        <View style={[styles.root, { backgroundColor: colors.background }]}>{body}</View>
      </ScreenScrollContext.Provider>
    );
  }

  return (
    <ScreenScrollContext.Provider value={api}>
      <ScrollView
        ref={attach}
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        // Bloqueado enquanto se arrasta uma linha (lista ordenável): o dedo não move a página.
        scrollEnabled={!locked}
        scrollEventThrottle={16}
        onScroll={(event) => onScroll(event.nativeEvent.contentOffset.y)}
        onContentSizeChange={(_width, height) => onContentSize(height)}
        onLayout={measure}>
        {body}
      </ScrollView>
    </ScreenScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    gap: spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  headerTexts: {
    flex: 1,
    gap: spacing.xs,
  },
  body: {
    gap: spacing['2xl'],
  },
});
