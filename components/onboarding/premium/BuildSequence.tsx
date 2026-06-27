import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/ui';
import { haptics } from '@/lib/ui/haptics';
import { colors, radius, spacing } from '@/lib/theme';

export type BuildStep = {
  id: string;
  label: string;
  /** Tarefa real opcional (ex.: prefetch, garantir categorias). */
  task?: () => Promise<void>;
};

type Status = 'pending' | 'running' | 'done';

const MIN_STEP_MS = 480;

/**
 * Executa cada passo sequencialmente: corre a tarefa real (se existir) com um
 * tempo mínimo para a animação respirar, e marca como concluído. Nunca é fake:
 * se houver `task`, ela é realmente aguardada.
 */
export function BuildSequence({
  steps,
  onComplete,
}: {
  steps: BuildStep[];
  onComplete: () => void;
}) {
  const [statuses, setStatuses] = useState<Status[]>(() => steps.map(() => 'pending'));
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;

    void (async () => {
      for (let i = 0; i < steps.length; i += 1) {
        if (cancelled) return;
        setStatuses((prev) => prev.map((s, idx) => (idx === i ? 'running' : s)));

        const start = Date.now();
        try {
          await steps[i].task?.();
        } catch {
          // Falha de inicialização não bloqueia o onboarding.
        }
        const elapsed = Date.now() - start;
        if (elapsed < MIN_STEP_MS) {
          await new Promise((resolve) => setTimeout(resolve, MIN_STEP_MS - elapsed));
        }

        if (cancelled) return;
        haptics.impact('light');
        setStatuses((prev) => prev.map((s, idx) => (idx === i ? 'done' : s)));
      }

      if (cancelled) return;
      haptics.notify('success');
      await new Promise((resolve) => setTimeout(resolve, 420));
      if (!cancelled) onComplete();
    })();

    return () => {
      cancelled = true;
    };
  }, [onComplete, steps]);

  return (
    <View style={styles.list}>
      {steps.map((step, index) => {
        const status = statuses[index];
        return (
          <Animated.View
            key={step.id}
            entering={FadeInDown.duration(360).delay(index * 70)}
            style={styles.row}>
            <View style={styles.icon}>
              {status === 'done' ? (
                <Animated.View entering={FadeIn.duration(220)}>
                  <SymbolView
                    name={{
                      ios: 'checkmark.circle.fill',
                      android: 'check_circle',
                      web: 'check_circle',
                    }}
                    tintColor={colors.success}
                    size={26}
                  />
                </Animated.View>
              ) : status === 'running' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <View style={styles.pendingDot} />
              )}
            </View>
            <Text
              variant="bodyMedium"
              color={status === 'pending' ? 'textMuted' : 'text'}
              style={styles.label}>
              {step.label}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  label: {
    flex: 1,
  },
});
