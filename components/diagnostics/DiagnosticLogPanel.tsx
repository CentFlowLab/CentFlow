import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { Button, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import {
  clearAppLog,
  exportAppLogText,
  subscribeAppLog,
  type AppLogEntry,
} from '@/lib/diagnostics';
import { colors, radius, spacing } from '@/lib/theme';

type DiagnosticLogPanelProps = {
  visible: boolean;
  onClose: () => void;
};

function levelColor(level: AppLogEntry['level']) {
  switch (level) {
    case 'error':
      return colors.danger;
    case 'warn':
      return colors.warning;
    case 'info':
      return colors.primary;
    default:
      return colors.textMuted;
  }
}

export function DiagnosticLogPanel({ visible, onClose }: DiagnosticLogPanelProps) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<AppLogEntry[]>([]);

  useEffect(() => {
    if (!visible) return;
    return subscribeAppLog(setEntries);
  }, [visible]);

  const errorCount = useMemo(
    () => entries.filter((entry) => entry.level === 'error').length,
    [entries],
  );

  async function handleShare() {
    const text = exportAppLogText();
    try {
      await Share.share({ message: text, title: 'CentFlow — Log de diagnóstico' });
    } catch {
      showToast('Não foi possível partilhar o log.', 'error');
    }
  }

  function handleClear() {
    clearAppLog();
    showToast('Log limpo.', 'info');
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.header}>
          <View>
            <Text variant="h2">Log de diagnóstico</Text>
            <Text variant="caption" color="textMuted">
              {entries.length} entradas · {errorCount} erros
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
              tintColor={colors.textMuted}
              size={28}
            />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {entries.length === 0 ? (
            <Text variant="body" color="textMuted" align="center">
              Sem entradas registadas.
            </Text>
          ) : (
            entries.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text variant="caption" style={{ color: levelColor(entry.level) }}>
                    {entry.level.toUpperCase()}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {entry.source}
                  </Text>
                </View>
                <Text variant="bodyMedium">{entry.message}</Text>
                {entry.stack ? (
                  <Text variant="caption" color="textMuted" style={styles.stack}>
                    {entry.stack}
                  </Text>
                ) : null}
                {entry.context ? (
                  <Text variant="caption" color="textMuted" style={styles.stack}>
                    {JSON.stringify(entry.context)}
                  </Text>
                ) : null}
                <Text variant="caption" color="textMuted">
                  {new Date(entry.timestamp).toLocaleString('pt-PT')}
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <Button label="Partilhar log" onPress={() => void handleShare()} fullWidth />
          <Button label="Limpar" variant="ghost" onPress={handleClear} fullWidth />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  entry: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stack: {
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
