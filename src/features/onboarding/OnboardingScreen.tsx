import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEFAULT_CURRENCY, parseAmountInput } from '@/core/money';
import { useRepositories } from '@/data';
import { BrandMark, Button, Icon, Text, TextField, type IconName } from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

import { NEW_TRANSACTION_HREF } from '../navigation/nav-items';
import { useAuth } from '../account/AuthProvider';
import {
  completeOnboarding,
  markOnboardingSeen,
  skipOnboardingForSession,
} from './onboarding-state';

type Step = 'welcome' | 'account' | 'ready';
const STEPS: readonly Step[] = ['welcome', 'account', 'ready'];

const MAX_WIDTH = 480;

/**
 * Primeira utilização (ADR-044): três passos, menos de um minuto. Mostra o que o Miven faz, cria a
 * conta principal com o saldo de hoje e propõe o primeiro registo. Concluído uma vez por conta, em
 * todos os aparelhos (ADR-067); "Mais tarde" volta a propô-lo na próxima abertura.
 */
export function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const repositories = useRepositories();
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState(() => t('onboarding.account.defaultName'));
  const [balance, setBalance] = useState('');
  const [error, setError] = useState<'amount' | 'name' | 'save' | null>(null);
  const [busy, setBusy] = useState(false);

  const { client, state } = useAuth();
  const userId = state.status === 'signedIn' ? state.user.id : null;

  /**
   * Sair antes do fim ("Mais tarde") não conclui: com conta, volta a ser proposto na próxima
   * abertura da app (ADR-067). Sem servidor (modo local), vale a marca do aparelho, como antes.
   */
  const leave = (href: Href) => {
    if (step !== 'ready') {
      if (userId) skipOnboardingForSession(userId);
      else void markOnboardingSeen();
    }
    router.replace(href);
  };

  const createAccount = async () => {
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('name');
      return;
    }
    const parsed = balance.trim()
      ? parseAmountInput(balance, DEFAULT_CURRENCY, { allowNegative: true })
      : ({ ok: true, amountMinor: 0 } as const);
    if (!parsed.ok) {
      setError('amount');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await repositories.accounts.create({
        name: trimmed,
        type: 'bank',
        currency: DEFAULT_CURRENCY,
        initialBalance: parsed.amountMinor,
      });
      // Concluído: grava no perfil da conta (ou fica pendente sem rede e é enviado depois).
      if (userId) await completeOnboarding(client, userId);
      else await markOnboardingSeen();
      setStep('ready');
    } catch {
      console.error('[onboarding] account_create_failed');
      setError('save');
    } finally {
      setBusy(false);
    }
  };

  const index = STEPS.indexOf(step);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.top, { paddingTop: insets.top + spacing.md }]}>
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={t('onboarding.progress', { step: index + 1, total: STEPS.length })}>
          {STEPS.map((item, position) => (
            <View
              key={item}
              style={[
                styles.dot,
                {
                  backgroundColor: position <= index ? colors.primary : colors.border,
                  width: position === index ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
        {step !== 'ready' ? (
          <Button
            label={t('onboarding.skip')}
            variant="ghost"
            size="sm"
            onPress={() => leave('/')}
          />
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {step === 'welcome' ? <Welcome /> : null}
          {step === 'account' ? (
            <View style={styles.block}>
              <Text variant="title1" accessibilityRole="header">
                {t('onboarding.account.title')}
              </Text>
              <Text variant="callout" tone="secondary">
                {t('onboarding.account.lead')}
              </Text>
              <TextField
                label={t('onboarding.account.name')}
                value={name}
                onChangeText={setName}
                maxLength={60}
                returnKeyType="next"
                errorText={error === 'name' ? t('validation.required') : undefined}
              />
              <TextField
                label={t('onboarding.account.balance')}
                value={balance}
                onChangeText={setBalance}
                placeholder={t('onboarding.account.balancePlaceholder')}
                keyboardType="numbers-and-punctuation"
                returnKeyType="done"
                onSubmitEditing={createAccount}
                autoFocus
                helperText={t('onboarding.account.balanceHelper')}
                errorText={error === 'amount' ? t('onboarding.account.amountInvalid') : undefined}
              />
              {error === 'save' ? (
                <Text variant="callout" tone="negative" accessibilityLiveRegion="polite">
                  {t('onboarding.account.saveFailed')}
                </Text>
              ) : null}
            </View>
          ) : null}
          {step === 'ready' ? <Ready /> : null}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacing.lg, borderTopColor: colors.border },
        ]}>
        <View style={styles.footerInner}>
          {step === 'welcome' ? (
            <Button label={t('onboarding.start')} onPress={() => setStep('account')} fullWidth />
          ) : null}
          {step === 'account' ? (
            <Button
              label={t('onboarding.account.create')}
              loading={busy}
              onPress={createAccount}
              fullWidth
            />
          ) : null}
          {step === 'ready' ? (
            <>
              <Button
                label={t('onboarding.ready.firstExpense')}
                icon="add"
                onPress={() => leave(NEW_TRANSACTION_HREF as Href)}
                fullWidth
              />
              <Button
                label={t('onboarding.ready.fixedCost')}
                icon="repeat-outline"
                variant="secondary"
                onPress={() => leave('/subscription/new' as Href)}
                fullWidth
              />
              <Button
                label={t('onboarding.ready.home')}
                variant="ghost"
                onPress={() => leave('/')}
                fullWidth
              />
            </>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Point({ icon, text }: { icon: IconName; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.point}>
      <View style={[styles.pointIcon, { backgroundColor: colors.primaryMuted }]}>
        <Icon name={icon} size={20} color="primaryText" />
      </View>
      <Text variant="body" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

function Welcome() {
  const { t } = useTranslation();
  return (
    <View style={styles.block}>
      <BrandMark size={56} />
      <Text variant="title1" accessibilityRole="header">
        {t('onboarding.welcome.title')}
      </Text>
      <Text variant="callout" tone="secondary">
        {t('onboarding.welcome.lead')}
      </Text>
      <View style={styles.points}>
        <Point icon="trending-up" text={t('onboarding.welcome.forecast')} />
        <Point icon="calendar-outline" text={t('onboarding.welcome.deadlines')} />
        <Point icon="shield-checkmark-outline" text={t('onboarding.welcome.privacy')} />
      </View>
    </View>
  );
}

function Ready() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.block}>
      <View style={[styles.doneIcon, { backgroundColor: colors.positiveMuted }]}>
        <Icon name="checkmark" size={32} color="positive" />
      </View>
      <Text variant="title1" accessibilityRole="header">
        {t('onboarding.ready.title')}
      </Text>
      <Text variant="callout" tone="secondary">
        {t('onboarding.ready.lead')}
      </Text>
      {Platform.OS === 'ios' ? (
        <View style={[styles.tip, { backgroundColor: colors.surfaceMuted }]}>
          <Icon name="phone-portrait-outline" size={18} color="textSecondary" />
          <Text variant="footnote" tone="secondary" style={styles.flex}>
            {t('onboarding.ready.iosTip')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: radius.full,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
  },
  content: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  block: {
    gap: spacing.lg,
  },
  points: {
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pointIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  footerInner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
