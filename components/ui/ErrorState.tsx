import { SymbolView } from 'expo-symbols';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing, useTheme, useThemedStyles } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme/types';
import {
  getScreenErrorContent,
  type ScreenErrorContext,
} from '@/lib/api/errors';

import { Button } from './Button';
import { Text } from './Text';

type ErrorStateProps = {
  /** Contexto para mensagens automáticas (ex: 'dashboard') */
  context?: ScreenErrorContext;
  error?: unknown;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  retryLoading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ErrorState({
  context = 'generic',
  error,
  title,
  description,
  onRetry,
  retryLabel = 'Tentar novamente',
  retryLoading = false,
  compact = false,
  style,
}: ErrorStateProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const content = getScreenErrorContent(error, context);

  return (
    <View style={[styles.container, compact && styles.compact, style]}>
      <View style={styles.iconWrapper}>
        <SymbolView
          name={{
            ios: 'wifi.exclamationmark',
            android: 'wifi_off',
            web: 'wifi_off',
          }}
          tintColor={colors.danger}
          size={compact ? 28 : 32}
        />
      </View>

      <Text variant={compact ? 'h3' : 'h2'} align="center" style={styles.title}>
        {title ?? content.title}
      </Text>

      <Text variant="body" color="textSecondary" align="center" style={styles.description}>
        {description ?? content.description}
      </Text>

      {onRetry ? (
        <Button
          label={retryLabel}
          onPress={onRetry}
          loading={retryLoading}
          fullWidth
          style={styles.retryButton}
        />
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing['3xl'],
      paddingVertical: spacing['4xl'],
      gap: spacing.md,
    },
    compact: {
      paddingVertical: spacing['2xl'],
    },
    iconWrapper: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.dangerMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    title: {
      maxWidth: 300,
    },
    description: {
      maxWidth: 320,
      lineHeight: 22,
    },
    retryButton: {
      width: '100%',
      maxWidth: 280,
      marginTop: spacing.lg,
    },
  });
}
