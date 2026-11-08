import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { i18n } from '@/i18n';
import { colorsByScheme } from '@/ui/theme/colors';

/**
 * Fica fora dos providers da app (tema, preferências), por isso usa apenas
 * primitivas do React Native e o tema do sistema.
 */
export function RootErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const colors = colorsByScheme[useColorScheme() === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    // Só o tipo do erro: a mensagem pode conter dados do utilizador.
    console.error(`[RootErrorBoundary] ${error.name}`);
  }, [error]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        {i18n.t('errors.unexpectedTitle')}
      </Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {i18n.t('errors.unexpectedDescription')}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={[styles.button, { backgroundColor: colors.primary }]}>
        <Text style={[styles.buttonLabel, { color: colors.onPrimary }]}>
          {i18n.t('common.retry')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 380,
  },
  button: {
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
