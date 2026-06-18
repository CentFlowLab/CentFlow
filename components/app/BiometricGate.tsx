import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { useAuth } from '@/lib/auth';
import {
  authenticateWithBiometrics,
  getBiometricSupport,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
} from '@/lib/security';
import { colors, spacing } from '@/lib/theme';

type BiometricGateProps = {
  children: React.ReactNode;
};

export function BiometricGate({ children }: BiometricGateProps) {
  const { isAuthenticated, signOut } = useAuth();
  const { data: preferences } = useUserPreferences();
  const [locked, setLocked] = useState(false);
  const [support, setSupport] = useState<{ available: boolean }>({ available: false });
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    void getBiometricSupport().then((result) => {
      setSupport({ available: result.available });
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !preferences?.biometricsEnabled || !support.available) {
      setLocked(false);
      return;
    }

    void setBiometricLockEnabled(true);

    const subscription = AppState.addEventListener('change', async (nextState) => {
      const wasBackground = appState.current.match(/inactive|background/);
      appState.current = nextState;

      if (wasBackground && nextState === 'active') {
        setLocked(true);
        const ok = await authenticateWithBiometrics();
        setLocked(!ok);
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated, preferences?.biometricsEnabled, support.available]);

  useEffect(() => {
    if (!isAuthenticated || !preferences?.biometricsEnabled || !support.available) return;

    let mounted = true;
    void authenticateWithBiometrics().then((ok) => {
      if (mounted) setLocked(!ok);
    });

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, preferences?.biometricsEnabled, support.available]);

  if (locked) {
    return (
      <View style={styles.overlay}>
        <Text variant="h3">CentFlow bloqueada</Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          Usa biometria para continuar ou termina sessão em segurança.
        </Text>
        <Button
          label="Desbloquear"
          onPress={async () => {
            const ok = await authenticateWithBiometrics();
            setLocked(!ok);
          }}
          fullWidth
        />
        <Button
          label="Terminar sessão"
          variant="ghost"
          onPress={() => {
            void setBiometricLockEnabled(false);
            void signOut();
          }}
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
