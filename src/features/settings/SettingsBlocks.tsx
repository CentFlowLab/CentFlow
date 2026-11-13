import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Divider, Icon, Text } from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

/** Recuo dos separadores entre linhas: alinha com o texto, depois do ícone. */
export const ROW_DIVIDER_INSET = spacing.lg + 36 + spacing.md;

/** Ícone neutro das linhas: o verde fica para o que está selecionado ou é a ação principal. */
export const NEUTRAL_ICON = { iconColor: 'textSecondary', iconBackground: 'surfaceMuted' } as const;

/** Cabeçalho de uma página das Definições: título e uma frase sobre o que lá está. */
export function SettingsPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.pageHeader}>
      <Text variant="title2" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="callout" tone="secondary">
        {description}
      </Text>
    </View>
  );
}

/**
 * Grupo de opções: título discreto, nota opcional e as linhas numa superfície única, separadas
 * por divisórias finas (sem um cartão por opção).
 */
export function SettingsGroup({
  title,
  note,
  children,
  plain = false,
}: {
  title?: string;
  /** Explicação curta por baixo das linhas. */
  note?: ReactNode;
  children: ReactNode;
  /** Sem superfície: para conteúdo que já tem a sua (ex.: um cartão de estado). */
  plain?: boolean;
}) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.group}>
      {title ? (
        <Text
          variant="overline"
          tone="tertiary"
          accessibilityRole="header"
          style={styles.groupTitle}>
          {title}
        </Text>
      ) : null}
      {plain ? (
        children
      ) : rows.length > 0 ? (
        <View
          style={[styles.surface, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {rows.map((row, index) => (
            <Fragment key={row.key ?? index}>
              {index > 0 ? <Divider inset={ROW_DIVIDER_INSET} /> : null}
              {row}
            </Fragment>
          ))}
        </View>
      ) : null}
      {note ? (
        <Text variant="footnote" tone="tertiary" style={styles.note}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

/** Valor atual à direita de uma linha. */
export function RowValue({ children }: { children: ReactNode }) {
  return (
    <Text variant="callout" tone="secondary" tabular numberOfLines={1} style={styles.value}>
      {children}
    </Text>
  );
}

/** Indica que a linha abre fora da app (browser ou email). */
export function ExternalMark() {
  return <Icon name="open-outline" size={16} color="textTertiary" />;
}

const styles = StyleSheet.create({
  pageHeader: {
    gap: spacing.xs,
  },
  group: {
    gap: spacing.sm,
  },
  groupTitle: {
    paddingHorizontal: spacing.xs,
  },
  surface: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
  },
  note: {
    paddingHorizontal: spacing.xs,
  },
  value: {
    maxWidth: 220,
  },
});
