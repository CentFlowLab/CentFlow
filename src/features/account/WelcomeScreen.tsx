import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark, Button, HeroCard, Icon, Text, type IconName } from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

const POINTS: readonly { key: 'sync' | 'private' | 'plan'; icon: IconName }[] = [
  { key: 'sync', icon: 'sync-outline' },
  { key: 'private', icon: 'lock-closed-outline' },
  { key: 'plan', icon: 'pie-chart-outline' },
];

/** Primeiro ecrã sem sessão: o Miven só se usa com conta (ADR-034). */
export function WelcomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing['3xl'], paddingBottom: insets.bottom + spacing['2xl'] },
      ]}>
      <View style={styles.inner}>
        <View style={styles.brand}>
          <BrandMark size={56} />
          <Text variant="title1" accessibilityRole="header">
            {t('welcome.title')}
          </Text>
          <Text variant="callout" tone="secondary" align="center">
            {t('welcome.tagline')}
          </Text>
        </View>

        <HeroCard style={styles.hero}>
          {POINTS.map((point) => (
            <View key={point.key} style={styles.point}>
              <View style={[styles.pointIcon, { backgroundColor: colors.heroSurface }]}>
                <Icon name={point.icon} size={18} color="heroText" />
              </View>
              <View style={styles.flex}>
                <Text variant="bodyStrong" tone="hero">
                  {t(`welcome.points.${point.key}.title`)}
                </Text>
                <Text variant="footnote" tone="heroMuted">
                  {t(`welcome.points.${point.key}.description`)}
                </Text>
              </View>
            </View>
          ))}
        </HeroCard>

        <View style={styles.actions}>
          <Button
            label={t('welcome.createAccount')}
            size="lg"
            fullWidth
            onPress={() => router.push('/auth/sign-up' as Href)}
          />
          <Button
            label={t('welcome.signIn')}
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => router.push('/auth/sign-in' as Href)}
          />
          <Text variant="caption" tone="tertiary" align="center">
            {t('welcome.accountRequired')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: 480,
    gap: spacing['2xl'],
    flexGrow: 1,
    justifyContent: 'center',
  },
  brand: { alignItems: 'center', gap: spacing.sm },
  hero: { gap: spacing.lg },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  pointIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: spacing.xxs },
  actions: { gap: spacing.md },
});
