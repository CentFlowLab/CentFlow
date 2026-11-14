import { Pressable, StyleSheet, View } from 'react-native';

import { useFloatingTabBarInset } from '../layout/floatingTabBar';
import { layout, radius, spacing, useTheme } from '../theme';
import { FadeIn } from './FadeIn';
import { Text } from './Text';

type Props = {
  message: string;
  actionLabel: string;
  onAction: () => void;
};

/** Aviso curto no fundo do ecrã com uma ação (ex.: "Movimento eliminado · Anular"). */
export function Snackbar({ message, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  // Acima da barra flutuante do telemóvel (zero noutros casos).
  const bottom = spacing.lg + useFloatingTabBarInset();
  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <FadeIn>
        <View
          style={[styles.bar, { backgroundColor: colors.text, shadowColor: colors.shadow }]}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert">
          <Text variant="callout" style={[styles.message, { color: colors.textInverse }]}>
            {message}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
            hitSlop={8}
            style={({ pressed }) => [styles.action, { opacity: pressed ? 0.7 : 1 }]}>
            <Text variant="bodyStrong" style={{ color: colors.textInverse }}>
              {actionLabel}
            </Text>
          </Pressable>
        </View>
      </FadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    maxWidth: 560,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    borderRadius: radius.lg,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  message: {
    flex: 1,
    paddingVertical: spacing.md,
  },
  action: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
