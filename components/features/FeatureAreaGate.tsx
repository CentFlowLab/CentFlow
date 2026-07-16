import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';

import { Button, Card, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useFeatureAreas } from '@/hooks/useFeatureAreas';
import { FEATURE_AREA_CONFIG } from '@/lib/onboarding/constants';
import type { FeatureAreaId } from '@/lib/onboarding/types';
import { colors, spacing } from '@/lib/theme';

type FeatureAreaGateProps = {
  feature: FeatureAreaId;
  children: React.ReactNode;
  preview?: boolean;
};

export function FeatureAreaGate({ feature, children, preview = false }: FeatureAreaGateProps) {
  const { isFeatureActive, activateFeature, onboardingCompleted } = useFeatureAreas();
  const { showToast } = useToast();
  const [activating, setActivating] = useState(false);

  if (!onboardingCompleted || isFeatureActive(feature)) {
    return <>{children}</>;
  }

  const config = FEATURE_AREA_CONFIG[feature];

  async function handleActivate() {
    setActivating(true);
    try {
      const ok = await activateFeature(feature);
      if (!ok) {
        showToast('Não foi possível activar esta área. Tenta novamente.', 'error');
      }
    } finally {
      setActivating(false);
    }
  }

  return (
    <View style={styles.wrap}>
      {preview ? <View style={styles.preview}>{children}</View> : null}

      <Card variant="elevated" style={styles.lockCard}>
        <View style={styles.lockHeader}>
          <Text style={styles.emoji}>{config.emoji}</Text>
          <View style={styles.lockText}>
            <Text variant="h3">{config.label}</Text>
            <Text variant="caption" color="textMuted">
              Disponível
            </Text>
          </View>
          <SymbolView
            name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
            tintColor={colors.textMuted}
            size={22}
          />
        </View>

        <Text variant="body" color="textSecondary" style={styles.description}>
          {config.activateHint}
        </Text>

        <Button
          label={activating ? 'A activar...' : 'Activar'}
          onPress={() => void handleActivate()}
          loading={activating}
          fullWidth
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: spacing.md,
  },
  preview: {
    opacity: 0.35,
    pointerEvents: 'none',
  },
  lockCard: {
    gap: spacing.lg,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  lockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emoji: {
    fontSize: 32,
  },
  lockText: {
    flex: 1,
    gap: 2,
  },
  description: {
    lineHeight: 22,
  },
});
