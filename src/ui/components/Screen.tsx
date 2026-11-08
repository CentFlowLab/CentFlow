import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

/** Estrutura base de cada ecrã: safe area, largura máxima em desktop e cabeçalho consistente. */
export function Screen({ title, subtitle, headerRight, children, scroll = true }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const breakpoint = useBreakpoint();
  const horizontal = breakpoint === 'compact' ? spacing.lg : spacing['3xl'];
  const top = insets.top + (breakpoint === 'compact' ? spacing.lg : spacing['3xl']);

  const body = (
    <View style={[styles.content, { paddingHorizontal: horizontal, paddingTop: top }]}>
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
    return <View style={[styles.root, { backgroundColor: colors.background }]}>{body}</View>;
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled">
      {body}
    </ScrollView>
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
    paddingBottom: spacing['4xl'],
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
