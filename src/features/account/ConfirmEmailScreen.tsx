import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, AppState, Linking, StyleSheet, View } from 'react-native';

import { Button, Icon, Screen, Text } from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

import { useAuth, type AuthErrorCode, type PendingConfirmation } from './AuthProvider';

/** O Supabase só aceita um novo email de confirmação 60 s depois do anterior. */
export const RESEND_COOLDOWN_MS = 60_000;
/** Verificação automática enquanto o ecrã está aberto (abaixo do limite de entradas do Supabase). */
export const CONFIRMATION_POLL_MS = 15_000;
/** Ao voltar à app várias vezes seguidas, não verifica mais do que isto. */
const MIN_CHECK_GAP_MS = 3_000;

function secondsLeft(pending: PendingConfirmation, now: number): number {
  if (pending.sentAt === null) return 0;
  return Math.max(0, Math.ceil((pending.sentAt + RESEND_COOLDOWN_MS - now) / 1000));
}

/** O link do email chega à app com `?code=…` (mesmo dispositivo que criou a conta). */
function codeFrom(url: string | null): string | null {
  if (!url) return null;
  const match = /[?&#]code=([^&#]+)/.exec(url);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Conta à espera da confirmação do email (como nas apps de bancos e carteiras): não se sai deste
 * ecrã sem confirmar ou sem escolher outra conta. Entra sozinho quando o email fica confirmado:
 * ao voltar à app, quando o link a abre e de 15 em 15 segundos.
 */
export function ConfirmEmailScreen({ pending }: { pending: PendingConfirmation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { actions } = useAuth();
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<'notYet' | AuthErrorCode | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState<'sent' | AuthErrorCode | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const lastCheck = useRef(0);
  const busy = useRef(false);

  const check = useCallback(
    async (manual: boolean) => {
      const started = Date.now();
      if (busy.current || (!manual && started - lastCheck.current < MIN_CHECK_GAP_MS)) return;
      busy.current = true;
      lastCheck.current = started;
      if (manual) setChecking(true);
      const result = await actions.checkConfirmation();
      busy.current = false;
      // Confirmado: a sessão abre a app e este ecrã desaparece.
      if (result.ok && result.value) return;
      if (manual) {
        setChecking(false);
        setOutcome(result.ok ? 'notYet' : result.error);
      }
    },
    [actions],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void check(false);
    }, CONFIRMATION_POLL_MS);
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') void check(false);
    });
    // O link de confirmação aberto no mesmo telemóvel volta à app com um código de sessão.
    const links = Linking.addEventListener('url', ({ url }) => {
      const code = codeFrom(url);
      if (!code) {
        void check(false);
        return;
      }
      void actions.exchangeCode(code).then((result) => {
        if (!result.ok) void check(false);
      });
    });
    return () => {
      clearInterval(timer);
      appState.remove();
      links.remove();
    };
  }, [actions, check]);

  const wait = secondsLeft(pending, now);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [wait]);

  const resend = async () => {
    setResending(true);
    const result = await actions.resendConfirmation();
    setResending(false);
    setNow(Date.now());
    setResent(result.ok ? 'sent' : result.error);
    setOutcome(null);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={[styles.iconRing, { backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.iconCore, { backgroundColor: colors.primaryMuted }]}>
            <Icon name="mail-unread-outline" size={32} color="primaryText" />
          </View>
        </View>
        <Text variant="title2" align="center" accessibilityRole="header">
          {t('auth.confirmEmail.title')}
        </Text>
        <Text variant="callout" tone="secondary" align="center">
          {t('auth.confirmEmail.lead')}
        </Text>
        <View style={[styles.emailPill, { backgroundColor: colors.surfaceMuted }]}>
          <Text variant="label" align="center" numberOfLines={1}>
            {pending.email}
          </Text>
        </View>
        <Text variant="callout" tone="secondary" align="center">
          {t('auth.confirmEmail.howTo')}
        </Text>

        <View style={styles.waiting} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="footnote" tone="secondary">
            {t('auth.confirmEmail.waiting')}
          </Text>
        </View>

        <Button
          label={t('auth.confirmEmail.check')}
          loading={checking}
          onPress={() => void check(true)}
          fullWidth
        />
        {outcome === 'notYet' ? (
          <Text variant="callout" tone="secondary" align="center" accessibilityLiveRegion="polite">
            {t('auth.confirmEmail.notYet')}
          </Text>
        ) : outcome ? (
          <Text variant="callout" tone="negative" align="center" accessibilityLiveRegion="polite">
            {t(`auth.errors.${outcome}`)}
          </Text>
        ) : null}

        <View style={[styles.resendBox, { borderColor: colors.border }]}>
          <Text variant="bodyStrong" align="center">
            {t('auth.confirmEmail.noEmail')}
          </Text>
          <Text variant="footnote" tone="tertiary" align="center">
            {t('auth.confirmEmail.spam')}
          </Text>
          <Button
            label={
              wait > 0
                ? t('auth.confirmEmail.resendIn', { seconds: wait })
                : t('auth.confirmEmail.resend')
            }
            icon="refresh"
            variant="secondary"
            loading={resending}
            disabled={wait > 0}
            onPress={resend}
            fullWidth
          />
          {resent === 'sent' ? (
            <Text variant="callout" tone="accent" align="center" accessibilityLiveRegion="polite">
              {t('auth.confirmEmail.resent')}
            </Text>
          ) : resent ? (
            <Text variant="callout" tone="negative" align="center" accessibilityLiveRegion="polite">
              {t(`auth.errors.${resent}`)}
            </Text>
          ) : null}
        </View>

        <Button
          label={t('auth.confirmEmail.otherAccount')}
          variant="ghost"
          onPress={actions.abandonConfirmation}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconCore: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailPill: {
    alignSelf: 'stretch',
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  resendBox: {
    alignSelf: 'stretch',
    alignItems: 'stretch',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.lg,
    marginTop: spacing.sm,
  },
});
