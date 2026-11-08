import { StyleSheet, View, type ViewProps } from 'react-native';

import { linearGradient, radius, spacing, useTheme } from '../theme';

type Props = ViewProps;

/**
 * Cartão de destaque com o gradiente de marca (ex.: saldo total, boas-vindas).
 * O texto sobre ele usa os tokens `hero*`, verificados contra os dois extremos do gradiente.
 */
export function HeroCard({ style, children, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.card, linearGradient(145, colors.heroStart, colors.heroEnd), style]}
      {...rest}>
      <View
        pointerEvents="none"
        style={[styles.orbLarge, { backgroundColor: colors.heroSurface }]}
      />
      <View
        pointerEvents="none"
        style={[styles.orbSmall, { backgroundColor: colors.heroSurface }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius['2xl'],
    padding: spacing['2xl'],
    overflow: 'hidden',
    gap: spacing.md,
  },
  orbLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: radius.full,
    top: -90,
    right: -70,
    opacity: 0.35,
  },
  orbSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: radius.full,
    bottom: -50,
    left: -30,
    opacity: 0.25,
  },
});
