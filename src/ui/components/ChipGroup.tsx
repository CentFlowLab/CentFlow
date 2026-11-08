import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../theme';
import { Text } from './Text';

type Props = {
  label: string;
  children: ReactNode;
  errorText?: string;
  /** Esconde o rótulo visual (continua disponível para leitores de ecrã). */
  hideLabel?: boolean;
};

/** Grupo de escolha única com chips que quebram linha. */
export function ChipGroup({ label, children, errorText, hideLabel = false }: Props) {
  return (
    <View style={styles.container}>
      {hideLabel ? null : (
        <Text variant="label" tone="secondary">
          {label}
        </Text>
      )}
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.chips}>
        {children}
      </View>
      {errorText ? (
        <Text variant="footnote" tone="negative" accessibilityLiveRegion="polite">
          {errorText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs + 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
