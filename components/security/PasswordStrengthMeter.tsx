import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { PasswordStrength } from '@/lib/security/passwordPolicy';
import { colors, radius, spacing } from '@/lib/theme';

type PasswordStrengthMeterProps = {
  strength: PasswordStrength;
  errors?: string[];
};

const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  weak: 'Fraca',
  medium: 'Média',
  strong: 'Forte',
  very_strong: 'Muito forte',
};

const STRENGTH_COLOR: Record<PasswordStrength, string> = {
  weak: colors.danger,
  medium: colors.warning,
  strong: colors.primary,
  very_strong: colors.success,
};

const STRENGTH_SEGMENTS: Record<PasswordStrength, number> = {
  weak: 1,
  medium: 2,
  strong: 3,
  very_strong: 4,
};

export function PasswordStrengthMeter({ strength, errors = [] }: PasswordStrengthMeterProps) {
  const activeSegments = STRENGTH_SEGMENTS[strength];

  return (
    <View style={styles.container}>
      <View style={styles.barRow}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              index < activeSegments && { backgroundColor: STRENGTH_COLOR[strength] },
            ]}
          />
        ))}
      </View>
      <Text variant="caption" style={{ color: STRENGTH_COLOR[strength] }}>
        {STRENGTH_LABEL[strength]}
      </Text>
      {errors.length > 0 ? (
        <View style={styles.errors}>
          {errors.map((error) => (
            <Text key={error} variant="caption" color="danger">
              • {error}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  errors: {
    gap: spacing.xs,
  },
});
