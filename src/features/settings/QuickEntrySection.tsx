import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { Button, Card, Section, Text } from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

import { openExternal } from '../account/legal-links';

/** Abre a app Atalhos do iOS. */
const SHORTCUTS_URL = 'shortcuts://';

/**
 * "Registo rápido": como ligar a ação "Registar despesa" ao toque duplo na traseira do iPhone.
 * A ação é nativa (`plugins/quick-expense`); só existe no iPhone.
 */
export function QuickEntrySection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (Platform.OS !== 'ios') return null;
  const steps = [
    t('quickEntry.step1'),
    t('quickEntry.step2'),
    t('quickEntry.step3'),
    t('quickEntry.step4'),
  ];
  return (
    <Section title={t('quickEntry.title')}>
      <Card padding="md" style={styles.card}>
        <Text variant="callout" tone="secondary">
          {t('quickEntry.description')}
        </Text>
        <View style={styles.steps}>
          {steps.map((step, index) => (
            <View key={step} style={styles.step}>
              <View style={[styles.stepNo, { backgroundColor: colors.primaryMuted }]}>
                <Text variant="caption" tone="accent">
                  {index + 1}
                </Text>
              </View>
              <Text variant="callout" style={styles.stepText}>
                {step}
              </Text>
            </View>
          ))}
        </View>
        <Text variant="footnote" tone="tertiary">
          {t('quickEntry.note')}
        </Text>
        <Button
          label={t('quickEntry.openShortcuts')}
          icon="open-outline"
          variant="secondary"
          onPress={() => openExternal(SHORTCUTS_URL)}
        />
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  steps: {
    gap: spacing.sm,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepNo: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
  },
});
