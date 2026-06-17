import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiagnosticLogPanel } from '@/components/diagnostics/DiagnosticLogPanel';
import { Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { isDiagnosticsEnabled, subscribeAppLog, type AppLogEntry } from '@/lib/diagnostics';
import { colors, radius, spacing } from '@/lib/theme';

export function DiagnosticOverlay() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const lastErrorId = useRef<string | null>(null);

  useEffect(() => {
    if (!isDiagnosticsEnabled()) return;

    return subscribeAppLog((entries: AppLogEntry[]) => {
      const errors = entries.filter((entry) => entry.level === 'error');
      setErrorCount(errors.length);

      const latest = errors[0];
      if (!latest || latest.id === lastErrorId.current) return;
      lastErrorId.current = latest.id;

      showToast(`Erro: ${latest.message}`, 'error');
    });
  }, [showToast]);

  if (!isDiagnosticsEnabled()) return null;

  return (
    <>
      <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          accessibilityLabel="Abrir log de diagnóstico">
          <Text variant="caption" color="textInverse" style={styles.fabText}>
            LOG{errorCount > 0 ? ` · ${errorCount}` : ''}
          </Text>
        </Pressable>
      </View>

      <DiagnosticLogPanel visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 9998,
    elevation: 9998,
  },
  fab: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: `${colors.danger}88`,
  },
  fabPressed: {
    opacity: 0.88,
  },
  fabText: {
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
