import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { Button, FadeIn, Icon, ListItem, Text } from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

import { openExternal } from '../account/legal-links';

/** Abre a app Atalhos do iOS. */
const SHORTCUTS_URL = 'shortcuts://';

/** Registo rápido existe só no iPhone (Toque posterior + App Intent, ADR-042). */
export function quickEntryAvailable(): boolean {
  return Platform.OS === 'ios';
}

/**
 * Definições › Experiência › Registo rápido: uma linha que abre, no próprio cartão, os passos para
 * ligar a ação "Registar despesa" ao toque duplo na traseira do iPhone.
 */
export function QuickEntryRow() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  if (!quickEntryAvailable()) return null;
  const steps = [
    t('quickEntry.step1'),
    t('quickEntry.step2'),
    t('quickEntry.step3'),
    t('quickEntry.step4'),
  ];
  return (
    <>
      <ListItem
        icon="flash-outline"
        iconColor="textSecondary"
        iconBackground="surfaceMuted"
        title={t('quickEntry.title')}
        subtitle={t('settings.quickEntryHint')}
        expanded={open}
        showChevron={false}
        trailing={<ListChevron open={open} />}
        onPress={() => setOpen((value) => !value)}
      />
      {open ? (
        <FadeIn style={styles.panel}>
          <Text variant="callout" tone="secondary">
            {t('quickEntry.description')}
          </Text>
          <View style={styles.steps}>
            {steps.map((step, index) => (
              <View key={step} style={styles.step}>
                <View style={[styles.stepNo, { backgroundColor: colors.surfaceMuted }]}>
                  <Text variant="caption" tone="secondary">
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
        </FadeIn>
      ) : null}
    </>
  );
}

/** Seta de "abrir por baixo": aponta para baixo fechada e para cima aberta. */
export function ListChevron({ open }: { open: boolean }) {
  return <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color="textTertiary" />;
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
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
