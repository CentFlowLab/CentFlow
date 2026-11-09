import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, EmptyState, FormScreen, Text, TextField } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { isAppleSignInAvailable, useAuth, type AuthErrorCode } from './AuthProvider';

/** Ecrã inicial sem sessão (fora das rotas tipadas até o Expo as regenerar). */
const WELCOME = '/welcome' as Href;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

type Field = 'email' | 'password';
type FieldErrors = Partial<Record<Field, 'invalidEmail' | 'passwordTooShort' | 'required'>>;

function validate(email: string | null, password: string | null, strict: boolean): FieldErrors {
  const errors: FieldErrors = {};
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
    return code === 'required' ? t('validation.required') : t(`auth.${code}`);
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const found = validate(email, password, false);
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
      <TextField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const submit = async () => {
    const found = validate(email, password, true);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setError(null);
    const result = await actions.signUp(email, password);
    setBusy(false);
    if (!result.ok) setError(result.error);
    // Sessão imediata: o router abre a app sozinho.
    else if (result.value !== 'signedIn') setAwaitingConfirmation(true);
  };

  if (awaitingConfirmation) {
    return (
      <AuthLayout title={t('auth.signUpTitle')}>
        <Notice
          title={t('auth.confirmEmail.title')}
          message={t('auth.confirmEmail.message', { email: email.trim() })}
          action={<Button label={t('common.ok')} onPress={() => closeModal(WELCOME)} />}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.signUpTitle')}
      intro={t('auth.signUpIntro')}
      footer={<Button label={t('auth.signUp')} loading={busy} onPress={submit} fullWidth />}>
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
      <TextField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        helperText={t('auth.passwordHelper', { count: MIN_PASSWORD_LENGTH })}
        onSubmitEditing={submit}
        errorText={fieldError(errors.password)}
      />
      <ErrorText code={error} />
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

/** Troca uma única vez o código PKCE do link por uma sessão. */
function useCodeExchange(): 'working' | 'done' | AuthErrorCode {
  const { actions } = useAuth();
  const params = useLocalSearchParams<{ code?: string; error_code?: string }>();
  const [status, setStatus] = useState<'working' | 'done' | AuthErrorCode>(
    params.code ? 'working' : params.error_code ? 'linkInvalid' : 'done',
  );
  const started = useRef(false);
  useEffect(() => {
    if (!params.code || started.current) return;
    started.current = true;
    void actions.exchangeCode(params.code).then((result) => {
      setStatus(result.ok ? 'done' : result.error);
    });
  }, [actions, params.code]);
  return status;
}

/** `/auth/callback` — link de confirmação de email (ou regresso de um fornecedor OAuth). */
export function AuthCallbackScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const status = useCodeExchange();

  return (
    <AuthLayout title={t('auth.callbackTitle')}>
      {status === 'working' ? (
        <ActivityIndicator color={colors.primary} accessibilityLabel={t('common.loading')} />
      ) : status === 'done' ? (
        <Notice
          title={t('auth.callbackDone.title')}
          message={t('auth.callbackDone.message')}
          action={<Button label={t('common.ok')} onPress={() => router.replace('/')} />}
        />
      ) : (
        <EmptyState
          icon="alert-circle-outline"
          title={t('auth.callbackFailed')}
          description={t(`auth.errors.${status}`)}
        />
      )}
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
          description={t(`auth.errors.${exchange === 'done' ? 'linkInvalid' : exchange}`)}>
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
      <TextField
        label={t('auth.newPassword')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
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
});
