import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { Button, DateFields, EmptyState, FormScreen, Icon, Text, TextField } from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

import { copyAppAddress, isolationFailure, readIsolationEnv } from '../app-shell/web-isolation';
import { closeModal } from '../finance/navigation';
import { useToday } from '../finance/useToday';
import { ageOn, MIN_SIGN_UP_AGE } from './age';
import { openExternal, PRIVACY_URL, TERMS_URL } from './legal-links';
import {
  emailOtpType,
  isAppleSignInAvailable,
  normalizeUsername,
  useAuth,
  USERNAME_PATTERN,
  type AuthErrorCode,
} from './AuthProvider';
import { PasswordField } from './PasswordField';

/** Ecrã inicial sem sessão (fora das rotas tipadas até o Expo as regenerar). */
const WELCOME = '/welcome' as Href;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

type Field = 'username' | 'email' | 'password' | 'birthDate';
type FieldErrors = Partial<
  Record<
    Field,
    | 'invalidEmail'
    | 'invalidIdentifier'
    | 'passwordTooShort'
    | 'usernameInvalid'
    | 'birthDateInvalid'
    | 'tooYoung'
    | 'required'
  >
>;

function validate(
  email: string | null,
  password: string | null,
  strict: boolean,
  username: string | null = null,
): FieldErrors {
  const errors: FieldErrors = {};
  if (username !== null) {
    const name = normalizeUsername(username);
    if (!name) errors.username = 'required';
    else if (!USERNAME_PATTERN.test(name)) errors.username = 'usernameInvalid';
  }
  if (email !== null) {
    if (!email.trim()) errors.email = 'required';
    else if (!EMAIL.test(email.trim())) errors.email = 'invalidEmail';
  }
  if (password !== null) {
    if (!password) errors.password = 'required';
    else if (strict && password.length < MIN_PASSWORD_LENGTH) errors.password = 'passwordTooShort';
  }
  return errors;
}

function useFieldError() {
  const { t } = useTranslation();
  return (code: FieldErrors[Field]) => {
    if (!code) return undefined;
    if (code === 'required') return t('validation.required');
    if (code === 'tooYoung') return t('auth.tooYoung', { age: MIN_SIGN_UP_AGE });
    return t(`auth.${code}`);
  };
}

function AuthLayout({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <FormScreen
      title={title}
      closeLabel={t('common.close')}
      onClose={() => closeModal(WELCOME)}
      footer={footer}>
      {intro ? (
        <Text variant="callout" tone="secondary">
          {intro}
        </Text>
      ) : null}
      {children}
    </FormScreen>
  );
}

function ErrorText({ code }: { code: AuthErrorCode | null }) {
  const { t } = useTranslation();
  if (!code) return null;
  return (
    <Text variant="callout" tone="negative" accessibilityLiveRegion="polite">
      {t(`auth.errors.${code}`)}
    </Text>
  );
}

function ConfirmEmail({ email, onDone }: { email: string; onDone: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const steps = [
    t('auth.confirmEmail.step1'),
    t('auth.confirmEmail.step2'),
    t('auth.confirmEmail.step3'),
  ];
  return (
    <View style={styles.confirm}>
      <View style={[styles.iconRing, { backgroundColor: colors.surfaceMuted }]}>
        <View style={[styles.iconCore, { backgroundColor: colors.primaryMuted }]}>
          <Icon name="mail-outline" size={32} color="primaryText" />
        </View>
      </View>
      <Text variant="title2" align="center">
        {t('auth.confirmEmail.title')}
      </Text>
      <Text variant="callout" tone="secondary" align="center">
        {t('auth.confirmEmail.lead')}
      </Text>
      <View style={[styles.emailPill, { backgroundColor: colors.surfaceMuted }]}>
        <Text variant="label" align="center" numberOfLines={1}>
          {email}
        </Text>
      </View>
      <View style={styles.steps}>
        {steps.map((step, index) => (
          <View key={step} style={styles.step}>
            <View style={[styles.stepNo, { backgroundColor: colors.primaryMuted }]}>
              <Text variant="label" tone="accent">
                {index + 1}
              </Text>
            </View>
            <Text variant="callout" style={styles.stepText}>
              {step}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="footnote" tone="tertiary" align="center">
        {t('auth.confirmEmail.spam')}
      </Text>
      <Button label={t('auth.confirmEmail.ready')} onPress={onDone} fullWidth />
    </View>
  );
}

function Notice({ title, message, action }: { title: string; message: string; action: ReactNode }) {
  return (
    <View style={styles.notice}>
      <Text variant="title3">{title}</Text>
      <Text variant="callout" tone="secondary">
        {message}
      </Text>
      {action}
    </View>
  );
}

/** `/auth/sign-in` */
function useAppleAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    void isAppleSignInAvailable().then(setAvailable);
  }, []);
  return available;
}

export function SignInScreen() {
  const { t } = useTranslation();
  const { actions } = useAuth();
  const fieldError = useFieldError();
  const appleAvailable = useAppleAvailable();
  const confirmed = one(useLocalSearchParams<{ confirmed?: string | string[] }>().confirmed);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    // Com "@" é um email; sem, um nome de utilizador.
    const identifier = email.trim();
    const found = validate(identifier.includes('@') ? identifier : null, password, false);
    if (!identifier) found.email = 'required';
    else if (!identifier.includes('@') && !USERNAME_PATTERN.test(normalizeUsername(identifier))) {
      found.email = 'invalidIdentifier';
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setError(null);
    const result = await actions.signIn(email, password);
    setBusy(false);
    // Com sessão, as páginas de quem não tem conta deixam de existir e o router abre a app.
    if (!result.ok) setError(result.error);
  };

  return (
    <AuthLayout
      title={t('auth.signInTitle')}
      intro={t('auth.signInIntro')}
      footer={<Button label={t('auth.signIn')} loading={busy} onPress={submit} fullWidth />}>
      {confirmed === '1' ? (
        <Text variant="callout" tone="accent">
          {t('auth.confirmedSignIn')}
        </Text>
      ) : confirmed === 'link' ? (
        <Text variant="callout" tone="secondary">
          {t('auth.confirmLinkUsed')}
        </Text>
      ) : null}
      <TextField
        label={t('auth.identifier')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.identifierPlaceholder')}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        keyboardType="email-address"
        textContentType="username"
        errorText={fieldError(errors.email)}
      />
      <PasswordField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
        errorText={fieldError(errors.password)}
      />
      <ErrorText code={error} />
      <View style={styles.links}>
        <Button
          label={t('auth.forgotPassword')}
          variant="ghost"
          onPress={() => router.replace('/auth/forgot-password' as Href)}
        />
        <Button
          label={t('auth.noAccount')}
          variant="ghost"
          onPress={() => router.replace('/auth/sign-up' as Href)}
        />
        {appleAvailable ? (
          <Button
            label={t('auth.signInWithApple')}
            icon="logo-apple"
            variant="secondary"
            onPress={async () => {
              const result = await actions.signInWithApple();
              if (!result.ok) setError(result.error);
            }}
          />
        ) : null}
      </View>
    </AuthLayout>
  );
}

/** `/auth/sign-up` */
export function SignUpScreen() {
  const { t } = useTranslation();
  const { actions } = useAuth();
  const fieldError = useFieldError();
  const today = useToday();
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const submit = async () => {
    const found = validate(email, password, true, username);
    if (!birthDate) found.birthDate = 'required';
    else if (birthDate > today) found.birthDate = 'birthDateInvalid';
    else if (ageOn(birthDate, today) < MIN_SIGN_UP_AGE) found.birthDate = 'tooYoung';
    setErrors(found);
    if (Object.keys(found).length > 0 || !birthDate) return;
    setBusy(true);
    setError(null);
    const result = await actions.signUp(email, password, username, birthDate);
    setBusy(false);
    if (!result.ok) setError(result.error);
    // Sessão imediata: o router abre a app sozinho.
    else if (result.value !== 'signedIn') setAwaitingConfirmation(true);
  };

  if (awaitingConfirmation) {
    return (
      <AuthLayout title={t('auth.signUpTitle')}>
        <ConfirmEmail email={email.trim()} onDone={() => router.replace('/auth/sign-in' as Href)} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.signUpTitle')}
      intro={t('auth.signUpIntro')}
      footer={<Button label={t('auth.signUp')} loading={busy} onPress={submit} fullWidth />}>
      <TextField
        label={t('auth.username')}
        value={username}
        onChangeText={setUsername}
        placeholder={t('auth.usernamePlaceholder')}
        autoCapitalize="none"
        autoComplete="username-new"
        autoCorrect={false}
        maxLength={24}
        helperText={t('auth.usernameHelper')}
        errorText={fieldError(errors.username)}
      />
      <DateFields
        label={t('auth.birthDate')}
        value={birthDate}
        onChange={setBirthDate}
        helperText={t('auth.birthDateHelper', { age: MIN_SIGN_UP_AGE })}
        errorText={fieldError(errors.birthDate)}
        labels={{
          day: t('auth.birthDay'),
          month: t('auth.birthMonth'),
          year: t('auth.birthYear'),
          dayPlaceholder: t('auth.birthDayPlaceholder'),
          monthPlaceholder: t('auth.birthMonthPlaceholder'),
          yearPlaceholder: t('auth.birthYearPlaceholder'),
          invalid: t('auth.birthDateInvalid'),
        }}
      />
      <TextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.emailPlaceholder')}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        errorText={fieldError(errors.email)}
      />
      <PasswordField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        helperText={t('auth.passwordHelper', { count: MIN_PASSWORD_LENGTH })}
        onSubmitEditing={submit}
        errorText={fieldError(errors.password)}
      />
      <ErrorText code={error} />
      <Text variant="footnote" tone="secondary">
        {t('auth.legalPrefix')}{' '}
        <Text
          variant="footnote"
          tone="accent"
          accessibilityRole="link"
          onPress={() => openExternal(TERMS_URL)}>
          {t('auth.legalTerms')}
        </Text>{' '}
        {t('auth.legalAnd')}{' '}
        <Text
          variant="footnote"
          tone="accent"
          accessibilityRole="link"
          onPress={() => openExternal(PRIVACY_URL)}>
          {t('auth.legalPrivacy')}
        </Text>
        .
      </Text>
      <Button
        label={t('auth.haveAccount')}
        variant="ghost"
        onPress={() => router.replace('/auth/sign-in' as Href)}
      />
    </AuthLayout>
  );
}

/** `/auth/forgot-password` */
export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { actions } = useAuth();
  const fieldError = useFieldError();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const found = validate(email, null, false);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setError(null);
    const result = await actions.requestPasswordReset(email);
    setBusy(false);
    if (result.ok) setSent(true);
    else setError(result.error);
  };

  if (sent) {
    return (
      <AuthLayout title={t('auth.forgotTitle')}>
        <Notice
          title={t('auth.linkSent.title')}
          message={t('auth.linkSent.message', { email: email.trim() })}
          action={<Button label={t('common.ok')} onPress={() => closeModal(WELCOME)} />}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.forgotTitle')}
      intro={t('auth.forgotIntro')}
      footer={<Button label={t('auth.sendLink')} loading={busy} onPress={submit} fullWidth />}>
      <TextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.emailPlaceholder')}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        onSubmitEditing={submit}
        errorText={fieldError(errors.email)}
      />
      <ErrorText code={error} />
    </AuthLayout>
  );
}

function one(value: string | string[] | undefined): string | undefined {
  const found = Array.isArray(value) ? value[0] : value;
  return found || undefined;
}

/**
 * No site publicado, o service worker de isolamento recarrega a página uma vez.
 * Confirmar antes desse recarregamento gastava o link e o segundo carregamento falhava.
 */
export type IsolationEnv = {
  web: boolean;
  isolated: boolean;
  /** O `coi-serviceworker` está na página (site publicado). */
  workerScript: boolean;
  serviceWorkers: boolean;
  secure: boolean;
};

/**
 * Só vale a pena esperar se o service worker puder mesmo recarregar a página. Sem service
 * workers (Brave, Chrome e o browser do Mail no iPhone usam WKWebView) esperar deixava o ecrã a
 * carregar para sempre.
 */
export function shouldWaitForIsolation(env: IsolationEnv): boolean {
  return env.web && !env.isolated && env.workerScript && env.serviceWorkers && env.secure;
}

function webMustWaitForIsolation(): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  return shouldWaitForIsolation({
    web: true,
    isolated: globalThis.crossOriginIsolated === true,
    workerScript: document.querySelector('script[src*="coi-serviceworker"]') !== null,
    serviceWorkers: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    secure: globalThis.isSecureContext !== false,
  });
}

/** Tempo máximo à espera do recarregamento do service worker antes de confirmar na mesma. */
export const ISOLATION_WAIT_MS = 4000;

function useIsolationWait(): boolean {
  const [waiting, setWaiting] = useState(webMustWaitForIsolation);
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => setWaiting(false), ISOLATION_WAIT_MS);
    return () => clearTimeout(timer);
  }, [waiting]);
  return waiting;
}

/** Troca uma única vez o código do link por uma sessão. O `token_hash` funciona em qualquer dispositivo. */
function useCodeExchange(): 'working' | 'done' | AuthErrorCode {
  const { actions } = useAuth();
  const params = useLocalSearchParams<{
    code?: string | string[];
    error_code?: string | string[];
    token_hash?: string | string[];
    type?: string | string[];
  }>();
  const code = one(params.code);
  const tokenHash = one(params.token_hash);
  const otpType = emailOtpType(one(params.type));
  const waitForIsolation = useIsolationWait();
  const [status, setStatus] = useState<'working' | 'done' | AuthErrorCode>(() => {
    if (tokenHash) return otpType ? 'working' : 'linkInvalid';
    if (code) return 'working';
    return one(params.error_code) ? 'linkInvalid' : 'done';
  });
  const started = useRef(false);
  useEffect(() => {
    if (waitForIsolation || started.current) return;
    if (tokenHash) {
      if (!otpType) return;
      started.current = true;
      void actions.verifyEmail(tokenHash, otpType).then((result) => {
        setStatus(result.ok ? 'done' : result.error);
      });
      return;
    }
    if (!code) return;
    started.current = true;
    void actions.exchangeCode(code).then((result) => {
      setStatus(result.ok ? 'done' : result.error);
    });
  }, [actions, code, otpType, tokenHash, waitForIsolation]);
  return status;
}

/** Email confirmado num browser que não corre a app (sem armazenamento). */
function ConfirmedInOtherBrowser() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <Notice
      title={t('auth.confirmedOtherBrowser.title')}
      message={t('auth.confirmedOtherBrowser.message')}
      action={
        <Button
          label={
            copied ? t('auth.confirmedOtherBrowser.copied') : t('auth.confirmedOtherBrowser.copy')
          }
          icon={copied ? 'checkmark' : 'copy-outline'}
          variant="secondary"
          onPress={() => {
            void copyAppAddress().then(setCopied);
          }}
        />
      }
    />
  );
}

/** `/auth/callback` — link de confirmação de email (ou regresso de um fornecedor OAuth). */
export function AuthCallbackScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { state } = useAuth();
  const link = useLocalSearchParams<{ code?: string | string[]; token_hash?: string | string[] }>();
  const hadLink = Boolean(one(link.code) || one(link.token_hash));
  const status = useCodeExchange();

  // Brave, Chrome e o browser do Mail no iPhone confirmam o email mas não guardam os dados:
  // em vez de abrir a app (e mostrar o erro de armazenamento), dizemos onde continuar.
  const [cannotStore] = useState(() => isolationFailure(readIsolationEnv()) === 'explain');
  const confirmedHere =
    cannotStore && hadLink && (status === 'done' || status === 'confirmedElsewhere');
  const entering = !confirmedHere && status === 'done' && state.status === 'signedIn';

  useEffect(() => {
    if (confirmedHere) return;
    if (entering) router.replace('/');
    else if (status === 'confirmedElsewhere') router.replace('/auth/sign-in?confirmed=1' as Href);
    else if (status === 'linkInvalid') router.replace('/auth/sign-in?confirmed=link' as Href);
  }, [confirmedHere, entering, status]);

  if (confirmedHere) {
    return (
      <AuthLayout title={t('auth.callbackTitle')}>
        <ConfirmedInOtherBrowser />
      </AuthLayout>
    );
  }

  if (status === 'done' && (entering || hadLink)) {
    return (
      <AuthLayout title={t('auth.callbackTitle')}>
        <ActivityIndicator color={colors.primary} accessibilityLabel={t('common.loading')} />
      </AuthLayout>
    );
  }

  if (status === 'done') {
    return (
      <AuthLayout title={t('auth.callbackTitle')}>
        <Notice
          title={t('auth.callbackConfirmed.title')}
          message={t('auth.callbackConfirmed.message')}
          action={
            <Button
              label={t('auth.callbackConfirmed.action')}
              onPress={() => router.replace('/auth/sign-in' as Href)}
            />
          }
        />
      </AuthLayout>
    );
  }

  if (status === 'working' || status === 'confirmedElsewhere' || status === 'linkInvalid') {
    return (
      <AuthLayout title={t('auth.callbackTitle')}>
        <ActivityIndicator color={colors.primary} accessibilityLabel={t('common.loading')} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('auth.callbackTitle')}>
      <EmptyState
        icon="alert-circle-outline"
        title={t('auth.callbackFailed')}
        description={t(`auth.errors.${status}`)}
      />
    </AuthLayout>
  );
}

/** `/auth/reset-password` — chega do link de recuperação; define a nova palavra-passe. */
export function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { actions, state } = useAuth();
  const fieldError = useFieldError();
  const exchange = useCodeExchange();
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    const found = validate(null, password, true);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setError(null);
    const result = await actions.updatePassword(password);
    setBusy(false);
    if (result.ok) setSaved(true);
    else setError(result.error);
  };

  if (exchange === 'working') {
    return (
      <AuthLayout title={t('auth.resetTitle')}>
        <ActivityIndicator color={colors.primary} accessibilityLabel={t('common.loading')} />
      </AuthLayout>
    );
  }
  if (exchange !== 'done' || state.status !== 'signedIn') {
    return (
      <AuthLayout title={t('auth.resetTitle')}>
        <EmptyState
          icon="alert-circle-outline"
          title={t('auth.callbackFailed')}
          description={t(
            `auth.errors.${exchange === 'done' || exchange === 'confirmedElsewhere' ? 'linkInvalid' : exchange}`,
          )}>
          <Button
            label={t('auth.sendLink')}
            onPress={() => router.replace('/auth/forgot-password' as Href)}
          />
        </EmptyState>
      </AuthLayout>
    );
  }
  if (saved) {
    return (
      <AuthLayout title={t('auth.resetTitle')}>
        <Notice
          title={t('auth.passwordUpdated')}
          message={t('auth.callbackDone.message')}
          action={<Button label={t('common.ok')} onPress={() => router.replace('/')} />}
        />
      </AuthLayout>
    );
  }
  return (
    <AuthLayout
      title={t('auth.resetTitle')}
      footer={<Button label={t('auth.resetSave')} loading={busy} onPress={submit} fullWidth />}>
      <PasswordField
        label={t('auth.newPassword')}
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        helperText={t('auth.passwordHelper', { count: MIN_PASSWORD_LENGTH })}
        onSubmitEditing={submit}
        errorText={fieldError(errors.password)}
      />
      <ErrorText code={error} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  links: {
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  notice: {
    gap: spacing.md,
  },
  confirm: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
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
  steps: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepNo: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
  },
});
