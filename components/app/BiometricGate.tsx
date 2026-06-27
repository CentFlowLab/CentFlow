import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useUpdatePreferences, useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { useAuth } from '@/lib/auth';
import {
  authenticateWithBiometrics,
  getBiometricSupport,
  setBiometricLockEnabled,
} from '@/lib/security';
import { colors, spacing } from '@/lib/theme';

type BiometricGateProps = {
  children: React.ReactNode;
};

/**
 * Aprovação biométrica por sessão (singleton de módulo, não estado React).
 * Garante que, depois de aprovado uma vez, não voltamos a pedir FaceID em
 * re-renders/remounts nem nas transições de AppState provocadas pelo próprio
 * diálogo de FaceID. Reposto a false em background→active genuíno.
 */
let biometricApprovedThisSession = false;

/** Janela após um prompt durante a qual ignoramos eventos de AppState (o diálogo de FaceID provoca inactive→active). */
const PROMPT_COOLDOWN_MS = 1500;

export function BiometricGate({ children }: BiometricGateProps) {
  const { isAuthenticated, signOut } = useAuth();
  const { data: preferences } = useUserPreferences();
  const updatePreferences = useUpdatePreferences();

  const [support, setSupport] = useState(false);
  const [locked, setLocked] = useState(false);
  const [failures, setFailures] = useState(0);
  const [escaping, setEscaping] = useState(false);

  const isPromptingRef = useRef(false);
  const lastPromptAtRef = useRef(0);
  const appState = useRef(AppState.currentState);

  const biometricsEnabled = Boolean(preferences?.biometricsEnabled);
  const gateActive = isAuthenticated && biometricsEnabled && support;

  useEffect(() => {
    let active = true;
    void getBiometricSupport().then((result) => {
      if (active) setSupport(result.available);
    });
    return () => {
      active = false;
    };
  }, []);

  const runPrompt = useCallback(async () => {
    // Uma só tentativa de cada vez — evita o loop infinito.
    if (isPromptingRef.current) return;
    if (biometricApprovedThisSession) {
      setLocked(false);
      return;
    }

    isPromptingRef.current = true;
    setLocked(true);
    try {
      const ok = await authenticateWithBiometrics();
      if (ok) {
        biometricApprovedThisSession = true;
        setFailures(0);
        setLocked(false);
      } else {
        // Não reabrir automaticamente — o utilizador decide (Tentar novamente / escape).
        setFailures((n) => n + 1);
        setLocked(true);
      }
    } finally {
      isPromptingRef.current = false;
      lastPromptAtRef.current = Date.now();
    }
  }, []);

  // Pedido inicial quando o gate fica activo (uma vez por sessão).
  useEffect(() => {
    if (!gateActive) {
      setLocked(false);
      setFailures(0);
      return;
    }
    void setBiometricLockEnabled(true);
    if (!biometricApprovedThisSession) {
      void runPrompt();
    }
  }, [gateActive, runPrompt]);

  // background→active genuíno → repedir; ignora transições provocadas pelo diálogo de FaceID.
  useEffect(() => {
    if (!gateActive) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previous = appState.current;
      appState.current = nextState;

      if (isPromptingRef.current) return;
      if (Date.now() - lastPromptAtRef.current < PROMPT_COOLDOWN_MS) return;

      const wasBackground = /inactive|background/.test(previous);
      if (wasBackground && nextState === 'active') {
        biometricApprovedThisSession = false;
        void runPrompt();
      }
    });
    return () => subscription.remove();
  }, [gateActive, runPrompt]);

  /** Escape de emergência: bypassa o FaceID, desativa a preferência e vai para o login normal. */
  const handleEscapeToPassword = useCallback(async () => {
    setEscaping(true);
    biometricApprovedThisSession = false;
    try {
      try {
        await updatePreferences.mutateAsync({ biometricsEnabled: false });
      } catch {
        // mesmo que falhe a persistência remota, desbloqueamos localmente
      }
      await setBiometricLockEnabled(false);
      setLocked(false);
      setFailures(0);
      await signOut();
    } finally {
      setEscaping(false);
    }
  }, [signOut, updatePreferences]);

  if (gateActive && locked) {
    const showEscape = failures >= 3;
    return (
      <View style={styles.overlay}>
        <Text variant="h3">CentFlow bloqueada</Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          {showEscape
            ? 'Não foi possível confirmar a biometria. Entra com email e password para continuar.'
            : 'Usa a biometria para continuar ou entra com email e password.'}
        </Text>

        {showEscape ? (
          <Button
            label={escaping ? 'A abrir login...' : 'Entrar com email e password'}
            onPress={handleEscapeToPassword}
            loading={escaping}
            disabled={escaping}
            fullWidth
          />
        ) : (
          <Button
            label="Tentar novamente"
            onPress={() => void runPrompt()}
            disabled={escaping}
            fullWidth
          />
        )}

        {showEscape ? (
          <Button
            label="Tentar biometria novamente"
            variant="secondary"
            onPress={() => void runPrompt()}
            disabled={escaping}
            fullWidth
          />
        ) : (
          <Button
            label="Entrar com email e password"
            variant="secondary"
            onPress={handleEscapeToPassword}
            loading={escaping}
            disabled={escaping}
            fullWidth
          />
        )}

        <Button
          label="Terminar sessão"
          variant="ghost"
          onPress={() => {
            biometricApprovedThisSession = false;
            void setBiometricLockEnabled(false);
            void signOut();
          }}
          disabled={escaping}
          fullWidth
        />
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  subtitle: {
    marginBottom: spacing.md,
  },
});
